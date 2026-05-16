do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rsvp_responses_contact_required_check'
  ) then
    alter table public.rsvp_responses
      add constraint rsvp_responses_contact_required_check
      check (email is not null or phone_number is not null)
      not valid;
  end if;
end;
$$;
