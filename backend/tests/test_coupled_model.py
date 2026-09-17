import unittest
from datetime import datetime, timezone
from src.coupled_model_contract import (
    CoupledModelConfig,
    GridDomain,
    HourlyCoupledOutput,
    ModelRunManifest,
    generate_ncr_standard_domains,
)
from src.feedback_diagnostics import (
    compute_feedback_sensitivity,
    compute_fire_sensitivity,
)
from src.namelist_generator import render_namelist_input


def make_sample_manifest(exp_type="operational_forecast", feedback_on=True, fires_on=True):
    domains = generate_ncr_standard_domains()
    cfg = CoupledModelConfig(
        solver="WRF-Chem-v4.5.1",
        chem_opt=202,
        chem_opt_name="MOZART_MOSAIC_4BIN",
        phot_opt=3,
        rad_opt_lw=4,
        rad_opt_sw=4,
        pbl_opt=1,
        aer_ra_feedback=1 if feedback_on else 0,
        aer_cu_feedback=1 if feedback_on else 0,
        fire_emiss_opt=1 if fires_on else 0,
        bio_emiss_opt=2,
        dust_opt=1,
    )
    return ModelRunManifest(
        run_id="RUN-TEST-001",
        issue_time_utc="2026-10-15T00:00:00Z",
        start_time_utc="2026-10-15T00:00:00Z",
        end_time_utc="2026-10-18T00:00:00Z",
        forecast_hours=72,
        spin_up_hours=12,
        experiment_type=exp_type,
        controlled_feedback_on=feedback_on,
        controlled_fires_on=fires_on,
        domains=domains,
        model_config_detail=cfg,
        input_met_source="NCEP_GFS_0p25",
        input_chem_bdy_source="CAMS_GLOBAL_NRT",
        input_anthropogenic_inventory="EDGAR_HTAPv3",
        input_fire_source="NASA_FIRMS_VIIRS",
        input_hashes={"met": "a" * 64, "chem": "b" * 64},
        status="completed",
        wall_clock_seconds=14200.0,
        compute_nodes=4,
        cores_per_node=32,
    )


class CoupledModelTests(unittest.TestCase):
    def test_domains_and_manifest_validation(self):
        manifest = make_sample_manifest()
        self.assertEqual(len(manifest.domains), 2)
        self.assertEqual(manifest.domains[0].grid_dx_m, 9000.0)
        self.assertEqual(manifest.domains[1].grid_dx_m, 3000.0)
        self.assertEqual(manifest.forecast_hours, 72)

    def test_namelist_input_generation(self):
        manifest = make_sample_manifest()
        namelist_text = render_namelist_input(manifest)
        self.assertIn("&time_control", namelist_text)
        self.assertIn("&domains", namelist_text)
        self.assertIn("&physics", namelist_text)
        self.assertIn("&chem", namelist_text)
        self.assertIn("chem_opt                            = 202, 202,", namelist_text)
        self.assertIn("aer_ra_feedback                     = 1, 1,", namelist_text)

    def test_feedback_sensitivity_calculation(self):
        t_valid = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
        # Feedback ON: dimmed radiation, lower T2, shallower PBL, higher surface PM2.5
        rec_on = HourlyCoupledOutput(
            run_id="RUN-ON",
            valid_time_utc=t_valid,
            lead_hour=12,
            domain_id=2,
            lat=28.6139,
            lon=77.2090,
            t2_celsius=24.5,
            q2_g_kg=6.2,
            u10_m_s=-1.5,
            v10_m_s=2.0,
            swdown_w_m2=480.0,
            pblh_m=650.0,
            pm25_ug_m3=185.0,
            pm10_ug_m3=290.0,
            o3_ppb=42.0,
            no2_ppb=38.0,
            so2_ppb=12.0,
            co_ppm=1.8,
            aod_550nm=1.2,
        )
        # Feedback OFF: clearer sky, warmer, deeper PBL, more dispersion
        rec_off = HourlyCoupledOutput(
            run_id="RUN-OFF",
            valid_time_utc=t_valid,
            lead_hour=12,
            domain_id=2,
            lat=28.6139,
            lon=77.2090,
            t2_celsius=25.8,
            q2_g_kg=6.2,
            u10_m_s=-1.5,
            v10_m_s=2.0,
            swdown_w_m2=590.0,
            pblh_m=920.0,
            pm25_ug_m3=148.0,
            pm10_ug_m3=230.0,
            o3_ppb=46.0,
            no2_ppb=34.0,
            so2_ppb=10.0,
            co_ppm=1.5,
            aod_550nm=0.0,
        )

        metrics = compute_feedback_sensitivity(rec_on, rec_off)
        self.assertEqual(metrics.delta_swdown_w_m2, -110.0)
        self.assertEqual(metrics.delta_t2_celsius, -1.3)
        self.assertEqual(metrics.delta_pblh_m, -270.0)
        self.assertEqual(metrics.delta_pm25_ug_m3, 37.0)
        self.assertTrue(metrics.feedback_signal_consistent)

    def test_fire_sensitivity_calculation(self):
        t_valid = datetime(2026, 10, 16, 6, 0, tzinfo=timezone.utc)
        rec_fire_on = HourlyCoupledOutput(
            run_id="RUN-FIRE-ON",
            valid_time_utc=t_valid,
            lead_hour=30,
            domain_id=2,
            lat=28.6139,
            lon=77.2090,
            t2_celsius=18.0,
            q2_g_kg=5.5,
            u10_m_s=0.5,
            v10_m_s=-1.2,
            swdown_w_m2=0.0,
            pblh_m=350.0,
            pm25_ug_m3=280.0,
            pm10_ug_m3=410.0,
            o3_ppb=18.0,
            no2_ppb=45.0,
            so2_ppb=15.0,
            co_ppm=2.6,
        )
        rec_fire_off = HourlyCoupledOutput(
            run_id="RUN-FIRE-OFF",
            valid_time_utc=t_valid,
            lead_hour=30,
            domain_id=2,
            lat=28.6139,
            lon=77.2090,
            t2_celsius=18.0,
            q2_g_kg=5.5,
            u10_m_s=0.5,
            v10_m_s=-1.2,
            swdown_w_m2=0.0,
            pblh_m=350.0,
            pm25_ug_m3=160.0,
            pm10_ug_m3=240.0,
            o3_ppb=18.0,
            no2_ppb=45.0,
            so2_ppb=15.0,
            co_ppm=1.7,
        )

        fire_metrics = compute_fire_sensitivity(rec_fire_on, rec_fire_off)
        self.assertEqual(fire_metrics.fire_pm25_contribution_ug_m3, 120.0)
        self.assertAlmostEqual(fire_metrics.fire_pm25_percentage, 42.86, places=1)


if __name__ == "__main__":
    unittest.main()
