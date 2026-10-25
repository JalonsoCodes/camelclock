alter table public.profiles
    add constraint profiles_username_reserved_check
    check (
        username is null
        or username not in (
            'admin',
            'administrator',
            'api',
            'abuse',
            'billing',
            'camelclock',
            'contact',
            'hello',
            'help',
            'legal',
            'mod',
            'moderator',
            'official',
            'privacy',
            'security',
            'staff',
            'support',
            'team',
            'terms'
        )
    ) not valid;
