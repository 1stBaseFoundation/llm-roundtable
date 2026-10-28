# Git Workflow — LLM Round Table

A hands-on reference for this repo. Everything here is safe to run; each section
says what it changes.

---

## 1. The mental model

Git stores **snapshots**, not deltas.

```
Working directory        Staging area (index)        Repository (.git)
   your files        ->    git add          ->     git commit
                                                  ->  commits, branches, tags
```

- **Commit** — an immutable snapshot + author + message + parent pointer(s).
- **Branch** — a movable label pointing at a commit. Cheap, local, disposable.
- **HEAD** — "where you are right now". Usually points at a branch.
- **Remote** — another copy of the repo (`origin` = GitHub) with its own branches.
- **Tracked / untracked / ignored** — three states for every file on disk.

Check all three constantly: `git status` is the command you will type most.

---

## 2. Everyday loop

```bash
git status                     # what changed?
git diff                       # unstaged changes, line by line
git diff --staged              # what is about to be committed
git add src/services/moderator.ts     # stage one file
git add -p                     # stage hunk by hunk (great habit)
git commit -m "fix: handle empty model response"
```

### Commit messages (Conventional Commits)

```
type(scope): summary in imperative mood

Optional body explaining *why*, not *what*.
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

Good: `fix(moderator): abort stream when Ollama disconnects`
Bad: `updates`, `stuff`, `fixed bug`

Small, single-purpose commits are worth more than perfect messages.

---

## 3. Branches

```bash
git switch -c feat/round-count        # create + switch (modern syntax)
git switch main                       # switch back
git branch                            # list local branches
git branch -d feat/round-count        # delete after merge
git branch -m old-name new-name       # rename
```

Rule of thumb: `main` always works. Do work on a branch, then merge via a Pull
Request on GitHub.

### Merging

```bash
git switch main
git merge feat/round-count      # fast-forward if main hasn't moved
```

- **Fast-forward** — main just slides forward. No merge commit.
- **Merge commit** — both histories diverged; git creates a commit with two parents.
- **Conflict** — both sides edited the same lines. Git writes `<<<<<<<` markers;
  edit the file to the desired result, then `git add <file>` and `git commit`.

### Rebase (rewriting your own unpushed commits)

```bash
git switch feat/round-count
git rebase main                 # replay your commits on top of latest main
```

Rebase gives a linear history but **rewrites commit hashes**. Never rebase a
branch someone else has pulled from.

```bash
git rebase -i HEAD~3            # squash/reword/reorder last 3 commits
```

---

## 4. Remotes, fetch, pull, push

```bash
git remote -v                              # show URLs
git remote add origin git@github.com:USER/REPO.git
git remote set-url origin <new-url>
git push -u origin main                    # first push, sets upstream
git push                                   # afterwards
git fetch origin                           # download, change nothing locally
git pull --ff-only                         # fetch + fast-forward only (safest)
```

`git pull` = `fetch` + `merge` (or `rebase`, if configured). If you are ever
unsure what a pull will do, run `git fetch` then `git log --oneline HEAD..origin/main`.

### Authentication on Windows

This machine uses **Git Credential Manager** — the first `git push` opens a
browser window, you approve, and the token is stored in Windows Credential
Manager. No PATs to paste manually.

---

## 5. Forks and Pull Requests

**Clone** — copy of a repo you have write access to (you push to it).
**Fork** — your own server-side copy of someone else's repo (you have write
access to the fork, not the original).

Typical open-source contribution:

```bash
gh repo fork owner/project --clone       # fork + clone + set up remotes
cd project
git remote -v      # origin = your fork, upstream = owner/project
git switch -c fix/typo
# ...edit...
git commit -am "docs: fix typo"
git push -u origin fix/typo
gh pr create --fill                      # open the PR
gh pr checks --watch                     # watch CI
```

Keep your fork current:

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

PR etiquette: one logical change per PR, describe *why*, respond to review with
new commits (don't force-push mid-review unless asked).

---

## 6. Undo — pick the right tool

| Goal | Command | Rewrites history? |
|---|---|---|
| Discard unstaged edits to a file | `git restore path/to/file` | No |
| Unstage a file, keep edits | `git restore --staged path/to/file` | No |
| Amend last commit message / add forgotten file | `git commit --amend` | Yes (local only) |
| Undo last commit, keep changes staged | `git reset --soft HEAD~1` | Yes (local only) |
| Undo last commit, keep changes unstaged | `git reset HEAD~1` | Yes (local only) |
| Undo last commit, **destroy** changes | `git reset --hard HEAD~1` | Yes — data loss |
| Undo a **pushed** commit safely | `git revert <sha>` | No, adds inverse commit |
| Recover "lost" commits/branches | `git reflog` then `git switch -c rescue <sha>` | No |

`git reflog` is your safety net: it records every position HEAD has had for
~90 days. Almost nothing is truly lost.

### Stash — park work without committing

```bash
git stash push -m "wip: artifact panel"
git stash list
git stash pop            # restore + drop
git stash apply          # restore + keep in list
```

---

## 7. Tags and releases

```bash
git tag -a v1.0.0 -m "First public release"
git push origin v1.0.0
gh release create v1.0.0 --generate-notes
```

Tags are permanent labels; use semver (`MAJOR.MINOR.PATCH`) for releases.

---

## 8. Inspecting history

```bash
git log --oneline --graph --decorate --all
git log -p src/services/moderator.ts     # history of one file
git log -S "abortController"             # when did this string appear?
git blame src/index.ts                   # who last touched each line
git show <sha>                           # one commit's full diff
git diff main...feat/round-count         # what a branch adds vs main
```

### Find the commit that broke something

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.0.0         # this one was fine
# git checks out midpoints; run your test, then:
git bisect good    # or: git bisect bad
git bisect reset
```

---

## 9. .gitignore

Patterns are relative to the `.gitignore` location; `dir/` matches at any depth.

```gitignore
node_modules/       # dependencies — never committed
dist/               # build output — reproducible
.env                # secrets — NEVER commit
data/*.json         # local transcripts in this project
```

Already-tracked file that you now want ignored:

```bash
git rm --cached .env
git commit -m "chore: stop tracking .env"
```

Ignore rules only stop *new* files; existing tracked files stay tracked.

---

## 10. This repo's setup (what was done)

```bash
git init -b main
# .gitignore: node_modules/, dist/, .env, data/*.json
git add -A
git commit -m "feat: initial commit - multi-agent LLM debate system"
gh repo create llm-roundtable --private --source . --remote origin --push
```

Two `package-lock.json` files are committed on purpose (root + `client/`) —
they pin exact dependency trees so installs are reproducible. Never ignore them
for applications.

---

## 11. Practice exercises

1. `git switch -c practice/hello` → add a line to `README.md` → commit → switch to
   `main` → confirm the line is gone → merge the branch → confirm it's back.
2. Make two branches that edit the same README line; merge both; resolve the
   conflict by hand.
3. Deliberately break something, commit it, then `git revert` that commit.
4. Use `git add -p` to split a two-change edit into two commits.
5. Commit garbage, then recover it with `git reflog` after `git reset --hard`.
6. Push a branch, open a PR against your own `main`, review it, merge it, delete
   the branch (`gh pr merge --squash --delete-branch`).
7. Fork someone else's small repo, fix a typo, open a real PR.
