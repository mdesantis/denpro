# MUI Dashboard Layout Shell

Wire MUI dashboard layout shell (no content) at `app.localhost.localdomain:3000` (`app/dashboards#show`).

## Plan

1.  Create `app/frontend/components/app/dashboard.tsx`
    -   Import `SideMenu`, `AppNavbar`, `Header` from `@/lib/mui_templates/v9.0.1/dashboard/components/`
    -   Import `AppTheme`, `CacheProvider`, `CssBaseline` from same template's `Dashboard.tsx`
    -   Drop `MainGrid` entirely — main content area is empty `<Box>` with same styling, nothing inside
    -   No `Copyright` footer

2.  Edit `app/views/app/dashboards/show.html.erb`
    -   Replace `<h1>app/dashboards#show</h1>` with `<%= react_component 'app/dashboard', ssr: true %>`

## Not changing

-   `app/views/layouts/app.html.erb` — already has `emotion-insertion-point`, `yield :ssr_emotion_styles`, Turbo, CSP. Ready.
-   `app/frontend/entrypoints/app.ts` — already imports `turbo_rails` + `turbo_react`. Ready.
-   `app/frontend/entrypoints/app.css` — already imports Roboto fonts. Ready.
-   `lib/mui_templates/` — untouched.
-   Routes, packages, config — untouched.
