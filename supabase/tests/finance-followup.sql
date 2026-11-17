-- Included by finance.sql inside its isolated transaction and synthetic fixture.
select public.edit_financial_plan(:'pa','save_reminder',1,jsonb_build_object('id',:'fx','reminder_text','Check receipt','reminder_priority','red'));
select pg_temp.check_true((select reminder_text='Check receipt' and reminder_priority='red' and amount=90 and row_version=2 from public.financial_entries where id=:'fx'),'Reminder preserves posted financial data and advances version');
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_reminder'',1,%L)',:'pa',jsonb_build_object('id',:'fx','reminder_text','Stale','reminder_priority','green')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_reminder'',1,%L)',:'pa',jsonb_build_object('id',:'income','reminder_text','Not an expense','reminder_priority','red')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_reminder'',2,%L)',:'pa',jsonb_build_object('id',:'fx','reminder_text','Bad priority','reminder_priority','purple')::text));
-- A duplicate reference fails AFTER voiding: the transaction must restore the original.
select pg_temp.denied(format('select public.edit_financial_plan(%L,''correct_entry'',1,%L)',:'pa',jsonb_build_object('id',:'income','kind','income','reference','IN-1','description','Correction','partner_id',:'p1','account_id',:'a1','entry_date','2026-07-01','original_currency_code','EUR','original_amount','900','register','true','reason','Correct amount')::text));
select pg_temp.check_true((select status='posted' and row_version=1 and amount=800 from public.financial_entries where id=:'income'),'Invalid replacement rolls back annulment');
select public.edit_financial_plan(:'pa','correct_entry',1,jsonb_build_object('id',:'income','kind','income','reference','IN-1-R1','description','Correction','partner_id',:'p1','account_id',:'a1','entry_date','2026-07-01','original_currency_code','EUR','original_amount','900','register','true','reason','Correct amount')) as corrected \gset
select pg_temp.check_true((select status='voided' and amount=800 from public.financial_entries where id=:'income'),'Original financial data retained');
select pg_temp.check_true((select correction_of_id=:'income' and amount=900 and status='posted' from public.financial_entries where id=:'corrected'),'Replacement linked and posted');
select pg_temp.check_true((select sum(amount)=900 from public.financial_entries where project_id=:'pa' and kind='income' and status='posted'),'Corrected income counted once');
select public.edit_financial_plan(:'pa','correct_entry',2,jsonb_build_object('id',:'fx','kind','expense','reference','FX-R1','notes','Approved overrun','description','Correction','partner_id',:'p2','line_item_id',:'item','entry_date','2026-08-06','original_currency_code','USD','original_amount','110','register','true','reason','Correct amount')) as corrected_fx \gset
select pg_temp.check_true((select reminder_text='Check receipt' and reminder_priority='red' and correction_of_id=:'fx' and amount=101.20 from public.financial_entries where id=:'corrected_fx'),'Expense correction carries reminder and validated conversion');
select public.edit_financial_plan(:'pa','save_reminder',3,jsonb_build_object('id',:'corrected_fx','reminder_text',''));
select pg_temp.check_true((select reminder_text is null and reminder_priority is null from public.financial_entries where id=:'corrected_fx'),'Clearing reminder removes priority too');
select pg_temp.denied(format('update public.financial_entries set amount=1 where id=%L',:'corrected'));
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.denied(format('select public.edit_financial_plan(%L,''save_reminder'',4,%L)',:'pa',jsonb_build_object('id',:'corrected_fx','reminder_text','Forbidden','reminder_priority','red')::text));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''correct_entry'',1,%L)',:'pa',jsonb_build_object('id',:'corrected','kind','income','register','true','reason','Forbidden')::text));
reset role;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
set local role authenticated;

select id as transfer_id from public.financial_entries where project_id=:'pa' and reference='TR-1' \gset
select public.edit_financial_plan(:'pa','correct_entry',1,(select to_jsonb(e) || jsonb_build_object('reference','TR-1-R','original_amount','350','register','true','reason','Correct transfer') from public.financial_entries e where id=:'transfer_id')) as transfer_corrected \gset
select pg_temp.check_true((select status='posted' and amount=350 and correction_of_id=:'transfer_id' from public.financial_entries where id=:'transfer_corrected'),'Transfer corrected without changing total income');
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','commitment','reference','CO-NEW','description','Unpaid contract','partner_id',:'p1','line_item_id',:'item','entry_date','2026-07-02','original_currency_code','EUR','original_amount','100','register','true','notes','Approved')) as unpaid \gset
select public.edit_financial_plan(:'pa','correct_entry',1,(select to_jsonb(e) || jsonb_build_object('reference','CO-NEW-R','original_amount','150','register','true','reason','Correct contract') from public.financial_entries e where id=:'unpaid')) as unpaid_corrected \gset
select pg_temp.check_true((select status='confirmed' and amount=150 and correction_of_id=:'unpaid' from public.financial_entries where id=:'unpaid_corrected'),'Unpaid commitment correction validated');
select public.edit_financial_plan(:'pa','save_entry',null,jsonb_build_object('kind','expense','reference','CO-PAY','description','Contract payment','partner_id',:'p1','line_item_id',:'item','commitment_id',:'unpaid_corrected','entry_date','2026-07-03','original_currency_code','EUR','original_amount','10','register','true','notes','Approved'));
select pg_temp.denied(format('select public.edit_financial_plan(%L,''correct_entry'',3,%L)',:'pa',(select to_jsonb(e) || jsonb_build_object('reference','CO-PAID-R','register','true','reason','Paid contract') from public.financial_entries e where id=:'unpaid_corrected')::text));
select pg_temp.check_true((select status='confirmed' from public.financial_entries where id=:'unpaid_corrected'),'Paid commitment protected from correction');
