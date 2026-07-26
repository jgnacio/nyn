#!/usr/bin/env bash
# Creates .env.local for the gift list and (optionally) applies the schema.
#
#   ./scripts/setup-supabase.sh
#
# Both secrets are read interactively — never pass them as arguments, or they
# land in your shell history and in the process list where any local user can
# read them with `ps`.
set -euo pipefail

PROJECT_REF="rrvicoesafbuwrzrvfaa"
ENV_FILE=".env.local"

# THE POOLER, NOT THE DIRECT HOST. `db.<ref>.supabase.co` resolves to an
# AAAA record only — Supabase moved direct connections to IPv6-only — so on
# any network without an IPv6 route to AWS it fails with a bare
# "Connection refused" that looks like a wrong password. The pooler is
# dual-stack and works from everywhere. Note the username carries the project
# ref (`postgres.<ref>`); with a plain `postgres` the pooler cannot tell which
# tenant you mean and rejects the login.
# Region is sa-east-1 and the prefix is `aws-1-` — verified against this
# project. `aws-0-sa-east-1` is a DIFFERENT endpoint and refuses the
# connection, so do not "fix" this by changing the digit.
DB_HOST="aws-1-sa-east-1.pooler.supabase.com"
DB_PORT="5432"
DB_USER="postgres.${PROJECT_REF}"

# Kept only for the error hint below.
DIRECT_HOST="db.${PROJECT_REF}.supabase.co"

# Run from the repo root no matter where the script is invoked from, so the
# relative paths below (.env.local, supabase/schema.sql) always resolve.
cd "$(dirname "$0")/.."

command -v python3 >/dev/null 2>&1 || {
  echo "Falta 'python3' en el PATH (se usa para percent-encodear la contraseña)." >&2
  exit 1
}

if [ -e "$ENV_FILE" ]; then
  printf '%s ya existe. ¿Sobrescribir? [s/N]: ' "$ENV_FILE"
  read -r overwrite
  case "$overwrite" in
    [sSyY]) ;;
    *) echo "Cancelado."; exit 0 ;;
  esac
fi

# The password is read with -s (no echo), which makes a typo invisible and
# therefore likely. So it is VERIFIED against the server before anything is
# written: an earlier version wrote .env.local first and, on a mistyped
# password, left behind a config file full of credentials that could not
# connect — the failure surfaced two steps later, pointing at the schema.
read_password() {
  local attempt=1
  while [ "$attempt" -le 3 ]; do
    printf 'Contraseña de Postgres: '
    read -rs PGPW
    printf '\n'

    if [ -z "$PGPW" ]; then
      echo "  La contraseña no puede estar vacía." >&2
      attempt=$((attempt + 1))
      continue
    fi

    # Leading/trailing whitespace is almost always a paste artifact, and
    # invisible with -s. Flag it rather than silently trimming: a password
    # legitimately containing spaces does exist.
    case "$PGPW" in
      " "*|*" ") echo "  Ojo: la contraseña empieza o termina con un espacio." >&2 ;;
    esac

    if ! command -v psql >/dev/null 2>&1; then
      echo "  (psql no está instalado — no puedo verificarla, sigo igual.)"
      return 0
    fi

    printf '  Verificando contra %s... ' "$DB_HOST"
    if PGPASSWORD="$PGPW" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d postgres -q -t -c 'select 1' >/dev/null 2>&1; then
      echo "OK"
      return 0
    fi

    echo "FALLÓ"
    echo "  Autenticación rechazada para $DB_USER. Probá de nuevo." >&2
    attempt=$((attempt + 1))
  done

  echo "Tres intentos fallidos. No se escribió nada." >&2
  echo "Sacá la contraseña de: Dashboard > Project Settings > Database." >&2
  return 1
}

read_password || exit 1

printf 'anon public key (Dashboard > Project Settings > API): '
read -r ANONKEY
[ -n "$ANONKEY" ] || { echo "La anon key no puede estar vacía." >&2; exit 1; }

# Percent-encoding is required, not cosmetic: a password containing @ : / ? #
# would otherwise be parsed as part of the connection URI's structure and the
# connection would fail — or worse, silently point somewhere else.
# The password goes in through argv rather than being interpolated into the
# Python source, so quotes and backslashes in it cannot break the script.
ENCPW=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' "$PGPW")

# umask before the write: the file is created 600 from birth. Doing chmod after
# the fact leaves a window where the secrets sit world-readable on disk.
(
  umask 077
  cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://${PROJECT_REF}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANONKEY}
DATABASE_URL=postgresql://${DB_USER}:${ENCPW}@${DB_HOST}:${DB_PORT}/postgres
EOF
)

unset ENCPW ANONKEY

echo "✓ $ENV_FILE escrito (permisos 600)."
echo

apply_schema() {
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql no está instalado — el esquema no se aplicó."
    echo "Pegá el contenido de supabase/schema.sql en el SQL Editor del dashboard."
    return 0
  fi

  # Safe to answer yes even if it already ran: schema.sql is idempotent
  # (CREATE ... IF NOT EXISTS, and the seed INSERTs are guarded by NOT EXISTS),
  # so re-applying will not duplicate categories or gifts.
  printf '¿Aplicar supabase/schema.sql ahora? (es idempotente) [S/n]: '
  read -r apply
  case "$apply" in
    [nN]) echo "Listo. Para aplicarlo después:"
          echo '  psql "$(grep "^DATABASE_URL=" .env.local | cut -d= -f2-)" -f supabase/schema.sql'
          return 0 ;;
  esac

  # PGPASSWORD (an env var), not the URI form — a connection URI with the
  # password inside would show up in `ps` output for any user on the machine.
  # A process's environment is only readable by its owner and root.
  # Note this takes the RAW password: percent-encoding is a URI concern, and
  # passing the encoded one here would try to authenticate with the wrong
  # string.
  if PGPASSWORD="$PGPW" psql \
      -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
      -v ON_ERROR_STOP=1 -f supabase/schema.sql; then
    echo
    echo "✓ Esquema aplicado."
    echo "  Tablas nyn_gift_* — separadas de las gift_* de la otra boda,"
    echo "  que viven en ESTA MISMA base. Nunca metas regalos en gift_*."
  else
    echo
    echo "✗ Falló al aplicar el esquema." >&2
    echo "  - Si dice 'Tenant or user not found': revisá que el usuario sea" >&2
    echo "    ${DB_USER} (con el ref pegado), no 'postgres' a secas." >&2
    echo "  - Si dice 'Connection refused': el host debe ser el pooler" >&2
    echo "    (${DB_HOST}), no el directo ${DIRECT_HOST}, que es IPv6-only." >&2
    echo "  - Como último recurso, pegá supabase/schema.sql en el SQL Editor." >&2
    return 1
  fi
}

# Both weddings live in this one Supabase project — verified: `gift_*` (Mauro
# & Barbi) and `nyn_gift_*` (ours) sit side by side in `public`. So "they don't
# mix" is not something to take on faith after every schema change; this
# re-checks it by running the SAME unfiltered query their page runs and
# confirming none of our gifts come back.
verify_separation() {
  command -v psql >/dev/null 2>&1 || return 0

  echo
  echo "Verificando separación con la otra boda..."
  PGPASSWORD="$PGPW" psql \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -v ON_ERROR_STOP=1 -t -A -F' ' <<'SQL' || return 0
select '  nuestros regalos (nyn_gift_items): ' || count(*) from nyn_gift_items;
select '  regalos de ellos (gift_items):     ' || count(*) from gift_items;
select case
  when count(*) = 0
    then '  ✓ su lista no devuelve ninguna fila nuestra'
  else '  ✗ ATENCIÓN: ' || count(*) || ' filas nuestras aparecen en gift_items'
end
from gift_items g
where exists (select 1 from nyn_gift_items n where n.id = g.id);
SQL
}

status=0
apply_schema || status=$?
# Plain `[ ... ] && verify_separation` would abort here under `set -e` when
# status is non-zero, skipping the exit below. An `if` has no such effect.
if [ "$status" -eq 0 ]; then
  verify_separation
fi
unset PGPW
exit "$status"
