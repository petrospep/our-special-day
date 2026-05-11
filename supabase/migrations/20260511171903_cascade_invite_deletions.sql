alter table public.rsvp_responses
  drop constraint if exists rsvp_responses_invite_code_fkey,
  add constraint rsvp_responses_invite_code_fkey
    foreign key (invite_code)
    references public.invitation_codes(code)
    on delete cascade;

alter table public.rsvp_guests
  drop constraint if exists rsvp_guests_invite_code_fkey,
  add constraint rsvp_guests_invite_code_fkey
    foreign key (invite_code)
    references public.invitation_codes(code)
    on delete cascade;

alter table public.song_requests
  drop constraint if exists song_requests_invite_code_fkey,
  add constraint song_requests_invite_code_fkey
    foreign key (invite_code)
    references public.invitation_codes(code)
    on delete cascade;
