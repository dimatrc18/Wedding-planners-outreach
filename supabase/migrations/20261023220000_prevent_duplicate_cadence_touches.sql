-- Anti-Flood & Deduplication: Prevent duplicate live touches even if a previous touch failed.
-- Guarantees Postgres blocks any attempt to insert a duplicate touch for a step that is draft, approved, sent, or failed.

DROP INDEX IF EXISTS public.touches_one_live_step;

CREATE UNIQUE INDEX touches_one_live_step ON public.touches (prospect_id, step_name)
  WHERE direction = 'out' 
    AND step_name IN ('T1_intro', 'T2_ig_dm', 'T3_followup', 'T4_breakup') 
    AND state IN ('draft', 'approved', 'sent', 'failed');
