# NoDrafts Housekeeping App Store Checklist

## Prepared in the repository

- App name: `NoDrafts Housekeeping`
- Bundle ID: `com.nodrafts.housekeeping`
- Version: `1.0.0`
- Build number: `1`
- iPhone-only configuration
- 1024 x 1024 app icon with no transparency
- Camera and photo-library permission descriptions
- Standard HTTPS encryption declaration
- Privacy Policy: `https://housekeeping-mobileapp.nodrafts.com/privacy.html`
- Support URL: `https://housekeeping-mobileapp.nodrafts.com/support.html`
- Terms: `https://housekeeping-mobileapp.nodrafts.com/terms.html`

Deploy the latest web export before entering these URLs in App Store Connect.

## Founder must provide in App Store Connect

1. Active paid Apple Developer Program membership.
2. App record using bundle ID `com.nodrafts.housekeeping`.
3. Suggested category: `Business`.
4. App description, subtitle, keywords, copyright, and age-rating answers.
5. At least one current iPhone screenshot. Three to five are recommended.
6. Privacy Policy URL and Support URL listed above.
7. App Privacy answers that match the deployed app.
8. App Review contact details and a working demo employee account.
9. Review notes explaining that accounts are provisioned by hotels and that camera/photo access is optional for incident attachments.

## App Privacy starting point

Confirm these answers with the backend owner before publishing:

- Contact Info: name and work email, linked to the user, used for app functionality.
- Identifiers: employee/user ID, linked to the user, used for app functionality and security.
- User Content: chat messages, incident text, and optional photos, linked to the user, used for app functionality.
- Other Data: hotel assignments, housekeeping activity, schedules, and shift requests, linked to the user, used for app functionality.
- Diagnostics: disclose only if production logging or monitoring retains device-level diagnostic data.
- Tracking: `No` unless an SDK is added that tracks users across other companies' apps or websites.

The app does not create employee accounts itself. Hotel administrators provision and manage access.

## Before submission

- Replace `feedback@nodrafts.com` if the company wants a dedicated support mailbox.
- Have legal counsel or the company owner approve the policy and terms wording.
- Deploy and open all three public URLs on a phone without signing in.
- Test login, housekeeping, schedule, chat, Spanish, incident photos, and logout on a release build.
- Confirm the production API URLs are used before uploading the build.
