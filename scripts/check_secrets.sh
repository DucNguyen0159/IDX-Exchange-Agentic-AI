#!/usr/bin/env bash
# Pre-push safety check. Run from anywhere inside the repo:
#   bash scripts/check_secrets.sh
# Exits non-zero if anything sensitive would be committed.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0
pass() { echo "PASS $1"; }
bad()  { echo "FAIL $1"; fail=1; }

files=$(git ls-files -co --exclude-standard)

echo "== Ignore rules =="
for p in .env .env.local resume/x handbooks/x lectures/x sql_files/x.sql dump.sql venv/x openclaw/x node_modules/x; do
  git check-ignore -q "$p" && pass "ignored: $p" || bad "NOT ignored: $p"
done

echo "== Sensitive paths =="
hits=$(echo "$files" | grep -Ei '(^|/)\.env$|\.sql(\.gz)?$|(^|/)(resume|handbooks|lectures|venv|openclaw)/')
[ -z "$hits" ] && pass "no sensitive paths" || bad "sensitive paths: $hits"

echo "== Secret values from .env =="
envfile=""
for f in .env ../.env; do [ -f "$f" ] && envfile="$f" && break; done
if [ -z "$envfile" ]; then
  echo "SKIP no .env found in repo or parent folder"
else
  leaks=0
  while IFS='=' read -r k v; do
    k="${k//[[:space:]]/}"; v="${v%$'\r'}"
    [[ -z "$k" || "$k" == \#* ]] && continue
    v="${v#"${v%%[![:space:]]*}"}"; v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    [ ${#v} -lt 6 ] && continue
    if echo "$files" | xargs -r grep -lF -- "$v" 2>/dev/null | grep -q .; then
      bad "value of $k found in repo files"; leaks=1
    fi
  done < "$envfile"
  [ $leaks -eq 0 ] && pass "no .env values in repo files ($envfile)"
fi

echo "== Line endings =="
crlf=$(echo "$files" | xargs -r file | grep CRLF)
[ -z "$crlf" ] && pass "no CRLF files" || bad "CRLF: $crlf"

echo "== File size (<5MB) =="
big=$(echo "$files" | xargs -r -I{} find {} -maxdepth 0 -size +5M 2>/dev/null)
[ -z "$big" ] && pass "no large files" || bad "large files: $big"

echo
[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || echo "CHECKS FAILED"
exit $fail
