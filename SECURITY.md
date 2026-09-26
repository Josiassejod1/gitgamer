# Security Policy

Please **don't open a public issue** for security problems. Report them privately with GitHub's [private vulnerability reporting](https://github.com/Josiassejod1/gamer-card/security/advisories/new) instead.

Things we care about most:
- User text that escapes the SVG escaping (XSS in cards)
- Ways to make the service fetch URLs outside the image allow-list (SSRF)
- Ways to leak the deployment's `GITHUB_TOKEN`

You'll get a reply within a week. Fixes are credited in the release notes unless you'd rather stay anonymous.
