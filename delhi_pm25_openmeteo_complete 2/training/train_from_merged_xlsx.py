"""Train/evaluate the exact CPCB prototype used by this project.

Expected merged workbook layout (the supplied cleaned workbook):
E=Station, F=From Date, H=PM2.5, Q=RH, R=WD, S=SR, T=RF, U=AT, V=BP.
The direct XLSX XML parser avoids loading the entire 600+ MB worksheet with openpyxl.
"""
from __future__ import annotations
import argparse, html, json, re, time, zipfile
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

LETTERS=['E','F','H','Q','R','S','T','U','V']
NAMES={'E':'Station','F':'timestamp','H':'pm25','Q':'RH','R':'WD','S':'SR','T':'RF','U':'AT','V':'BP'}
PAT=re.compile(rb'<c r="([EFHQRSTUV])\d+"[^>]*>(?:<is><t>(.*?)</t></is>|<v>(.*?)</v>)</c>')
FEATURES=['AT','RH','wind_dir_sin','wind_dir_cos','SR','RF','BP','hour_sin','hour_cos','doy_sin','doy_cos','pm_lag_1','pm_lag_3','pm_lag_6','pm_lag_12','pm_lag_24']

def parse_fast(path):
    out={NAMES[c]:[] for c in LETTERS}
    with zipfile.ZipFile(path) as z, z.open('xl/worksheets/sheet1.xml') as f:
        buf=b''
        while True:
            chunk=f.read(8*1024*1024)
            if not chunk: break
            buf += chunk
            parts=buf.split(b'</row>'); buf=parts.pop()
            for rb in parts:
                pos=rb.rfind(b'<row ')
                if pos<0: continue
                vals={}
                for col,tval,vval in PAT.findall(rb[pos:]):
                    raw=tval if tval else vval
                    vals[col.decode()]=html.unescape(raw.decode('utf-8','ignore'))
                if vals.get('F') and vals.get('H') and vals.get('E') and vals.get('F')!='From Date':
                    for c in LETTERS: out[NAMES[c]].append(vals.get(c,''))
    return pd.DataFrame(out)

def prepare(df):
    df['timestamp']=pd.to_datetime(df['timestamp'],format='%d-%m-%Y %H:%M',errors='coerce')
    for c in ['pm25','RH','WD','SR','RF','AT','BP']: df[c]=pd.to_numeric(df[c],errors='coerce')
    df['Station']=df['Station'].astype(str).str.strip()
    df=df.dropna(subset=['Station','timestamp','pm25'])
    df=df[(df.pm25>=0)&(df.pm25<=999)]
    df=df.sort_values(['Station','timestamp']).drop_duplicates(['Station','timestamp'],keep='last').reset_index(drop=True)
    g=df.groupby('Station',sort=False)
    for lag in [1,3,6,12,24]:
        df[f'pm_lag_{lag}']=g.pm25.shift(lag)
        lagts=g.timestamp.shift(lag)
        dh=(df.timestamp-lagts).dt.total_seconds()/3600
        df.loc[(dh-lag).abs()>0.01,f'pm_lag_{lag}']=np.nan
    rad=np.deg2rad(df.WD); df['wind_dir_sin']=np.sin(rad); df['wind_dir_cos']=np.cos(rad)
    h=df.timestamp.dt.hour+df.timestamp.dt.minute/60
    df['hour_sin']=np.sin(2*np.pi*h/24); df['hour_cos']=np.cos(2*np.pi*h/24)
    doy=df.timestamp.dt.dayofyear
    df['doy_sin']=np.sin(2*np.pi*doy/365.25); df['doy_cos']=np.cos(2*np.pi*doy/365.25)
    return df.replace([np.inf,-np.inf],np.nan).dropna(subset=['pm25','pm_lag_1']).copy()

def new_model():
    return XGBRegressor(objective='reg:squarederror',max_depth=6,learning_rate=0.03,n_estimators=600,subsample=0.8,colsample_bytree=0.8,tree_method='hist',n_jobs=-1,random_state=42)

def metrics(y,p):
    e=np.abs(y-p)
    return {'rmse':float(np.sqrt(mean_squared_error(y,p))),'mae':float(mean_absolute_error(y,p)),'r2':float(r2_score(y,p)),'within_10_pct':float(np.mean(e<=10)*100),'within_25_pct':float(np.mean(e<=25)*100),'within_50_pct':float(np.mean(e<=50)*100),'bias':float(np.mean(p-y))}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='Merged_Clean_Air_Quality_All_Years.xlsx')
    ap.add_argument('--out-dir', default='retrained_models')
    ap.add_argument('--cutoff', default='2024-10-01')
    ap.add_argument('--mode', choices=['evaluate','production','both'], default='both')
    args=ap.parse_args()
    out=Path(args.out_dir); out.mkdir(parents=True,exist_ok=True)
    t=time.time(); df=prepare(parse_fast(args.input)); print(f'Prepared {len(df):,} model rows in {time.time()-t:.1f}s')
    (out/'feature_columns.json').write_text(json.dumps(FEATURES,indent=2))
    if args.mode in ('evaluate','both'):
        cut=pd.Timestamp(args.cutoff); train=df[df.timestamp<cut]; test=df[df.timestamp>=cut]
        model=new_model(); model.fit(train[FEATURES],train.pm25)
        y=test.pm25.to_numpy(); pred=np.clip(model.predict(test[FEATURES]),0,999); pers=test.pm_lag_1.to_numpy()
        result={'scope':'Chronological one-hour-ahead hold-out evaluation','split':{'cutoff':args.cutoff,'train_rows':len(train),'test_rows':len(test)},'persistence':metrics(y,pers),'xgboost':metrics(y,pred)}
        model.save_model(out/'xgboost_pm25_evaluation.json'); (out/'evaluation_metrics.json').write_text(json.dumps(result,indent=2)); print(json.dumps(result,indent=2))
    if args.mode in ('production','both'):
        model=new_model(); model.fit(df[FEATURES],df.pm25); model.save_model(out/'xgboost_pm25_production.json')
        meta={'rows':len(df),'stations':int(df.Station.nunique()),'start':str(df.timestamp.min()),'end':str(df.timestamp.max()),'features':FEATURES}
        (out/'production_metadata.json').write_text(json.dumps(meta,indent=2)); print('Production model trained:',json.dumps(meta,indent=2))
if __name__=='__main__': main()
