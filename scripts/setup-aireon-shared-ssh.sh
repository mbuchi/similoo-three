#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ -z "${AIREON_SHARED_DEPLOY_KEY:-}" ]]; then
  echo "AIREON_SHARED_DEPLOY_KEY is required to install @aireon/shared in CI/deploy."
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

key_file="$HOME/.ssh/aireon_shared_deploy_key"
printf '%s\n' "$AIREON_SHARED_DEPLOY_KEY" > "$key_file"
chmod 600 "$key_file"

known_hosts="$HOME/.ssh/known_hosts"
github_ed25519_host='github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl'
# GitHub-published fingerprint: SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU
printf '%s\n' "$github_ed25519_host" > "$known_hosts"
chmod 600 "$known_hosts"

printf -v key_file_q '%q' "$key_file"
printf -v known_hosts_q '%q' "$known_hosts"
git config --global core.sshCommand "ssh -i $key_file_q -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$known_hosts_q"
