# Rollback Plan - Revert to Basic SPA

## If Something Breaks - Quick Revert

### Option 1: Update vercel.json (EASIEST - 30 seconds)

**Just change vercel.json back to serve only the web directory:**

```json
{
  "buildCommand": null,
  "outputDirectory": "web",
  "installCommand": "cd web && npm install",
  "framework": null
}
```

**That's it!** Your site will be back to the basic SPA.

---

### Option 2: Git Revert (If you want to undo commits)

```bash
# See what changed
git log --oneline -5

# Revert to before Next.js changes
git revert [commit-hash]

# Or go back to a specific commit
git checkout [old-commit-hash] -- vercel.json
git commit -m "Revert to basic SPA"
git push
```

---

### Option 3: Remove Next.js Files (Nuclear option)

If you want to completely remove Next.js:

```bash
# Remove Next.js files
rm -rf pages/ lib/ next.config.js
rm package.json package-lock.json
rm -rf node_modules

# Update vercel.json to basic SPA config
# (See Option 1 above)

# Commit and push
git add .
git commit -m "Remove Next.js, revert to SPA"
git push
```

---

## Quick Test After Revert

1. Visit your site
2. Should see your SPA working normally
3. SEO pages will be gone (but SPA works)

---

## What Won't Break

✅ Your SPA code in `/web/` is untouched
✅ Your backend/Supabase is separate
✅ All your data is safe
✅ You can always add SEO back later

---

## Bottom Line

**Easiest revert:** Just change `vercel.json` back to the old config (Option 1).

**Your SPA will work immediately.** No data loss, no code loss.

