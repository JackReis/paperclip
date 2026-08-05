#!/usr/bin/env python3
"""Debug version of the cloud admission wrapper with extra logging."""
import json
import os
import sys

# Monkey-patch to add debug logging
import datetime
import fcntl
import secrets
import signal
import stat
import subprocess
import time

DEBUG = True
def dbg(msg):
    if DEBUG:
        sys.stderr.write(f"[DBG pid={os.getpid()}] {msg}\n")
        sys.stderr.flush()

class PolicyError(Exception):
    pass

class StateError(Exception):
    pass

class AdmissionError(Exception):
    def __init__(self, message, exit_code):
        super().__init__(message)
        self.exit_code = exit_code

DEFAULT_POLICY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "policy", "ollama-cloud-admission", "cloud-admission-policy.v1.json",
)

PLAN_CONCURRENCY_CEILING = 10

_REQUIRED_POLICY_KEYS = frozenset({
    "schema_version", "route_classes", "direct_route_classes",
    "wrapped_route_class", "concurrency", "state", "env_refs",
    "bounds", "privacy", "exit_codes",
})
_REQUIRED_CONCURRENCY_KEYS = frozenset({"capacity", "ceiling"})
_REQUIRED_STATE_KEYS = frozenset({"directory_env", "slot_lock_pattern", "slot_owner_pattern"})
_REQUIRED_ENV_REF_KEYS = frozenset({"paperclip_run_id", "paperclip_agent_id"})
_REQUIRED_BOUNDS_KEYS = frozenset({"wait_seconds", "poll_interval_seconds", "grace_seconds"})
_REQUIRED_PRIVACY_KEYS = frozenset({"owner_metadata_fields"})
_REQUIRED_EXIT_CODES = frozenset({"EX_USAGE", "EX_TEMPFAIL"})


def _safe_name(name):
    if not name or name in (".", "..") or "/" in name or "\\" in name:
        return False
    return True


def _assert_string(path, value):
    if not isinstance(value, str):
        raise PolicyError(f"{path} must be a string, got {type(value).__name__}")


def _assert_mapping(path, value):
    if not isinstance(value, dict):
        raise PolicyError(f"{path} must be a mapping, got {type(value).__name__}")


def _assert_list_of_strings(path, value):
    if not isinstance(value, list):
        raise PolicyError(f"{path} must be a list, got {type(value).__name__}")
    for i, item in enumerate(value):
        if not isinstance(item, str):
            raise PolicyError(f"{path}[{i}] must be a string")


def _assert_positive_number(path, value):
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise PolicyError(f"{path} must be a number")
    if value <= 0:
        raise PolicyError(f"{path} must be positive")


def _assert_positive_int(path, value):
    if not isinstance(value, int) or isinstance(value, bool):
        raise PolicyError(f"{path} must be an integer")
    if value <= 0:
        raise PolicyError(f"{path} must be a positive integer")


def _validate_slot_pattern(path, pattern):
    _assert_string(path, pattern)
    try:
        sample = pattern.format(slot=0)
    except (KeyError, IndexError, ValueError) as exc:
        raise PolicyError(f"{path} is not a valid slot pattern: {exc}")
    if sample == pattern:
        raise PolicyError(f"{path} must contain a {{slot}} placeholder")
    if not _safe_name(sample):
        raise PolicyError(f"{path} formats to an unsafe filename: {sample!r}")


def load_policy(path):
    with open(path, "r", encoding="utf-8") as f:
        policy = json.load(f)
    _assert_mapping("policy", policy)
    for key in policy:
        if key not in _REQUIRED_POLICY_KEYS:
            raise PolicyError(f"unknown policy field: {key}")
    for key in _REQUIRED_POLICY_KEYS:
        if key not in policy:
            raise PolicyError(f"missing policy field: {key}")
    _assert_string("schema_version", policy["schema_version"])
    _assert_mapping("route_classes", policy["route_classes"])
    for name, cfg in policy["route_classes"].items():
        _assert_mapping(f"route_classes.{name}", cfg)
        if "mode" not in cfg:
            raise PolicyError(f"route_classes.{name} missing mode")
        if cfg["mode"] not in ("wrap", "direct"):
            raise PolicyError(f"route_classes.{name} mode must be wrap or direct")
    _assert_list_of_strings("direct_route_classes", policy["direct_route_classes"])
    for rc in policy["direct_route_classes"]:
        if rc not in policy["route_classes"]:
            raise PolicyError(f"direct route class {rc} is not defined")
    _assert_string("wrapped_route_class", policy["wrapped_route_class"])
    if policy["wrapped_route_class"] not in policy["route_classes"]:
        raise PolicyError("wrapped_route_class is not defined")
    if policy["route_classes"][policy["wrapped_route_class"]]["mode"] != "wrap":
        raise PolicyError("wrapped_route_class must have mode wrap")
    _assert_mapping("concurrency", policy["concurrency"])
    for key in _REQUIRED_CONCURRENCY_KEYS:
        if key not in policy["concurrency"]:
            raise PolicyError(f"concurrency missing {key}")
    for key in policy["concurrency"]:
        if key not in _REQUIRED_CONCURRENCY_KEYS:
            raise PolicyError(f"unknown concurrency field: {key}")
    _assert_positive_int("concurrency.capacity", policy["concurrency"]["capacity"])
    _assert_positive_int("concurrency.ceiling", policy["concurrency"]["ceiling"])
    if policy["concurrency"]["ceiling"] > PLAN_CONCURRENCY_CEILING:
        raise PolicyError(
            f"concurrency.ceiling {policy['concurrency']['ceiling']} exceeds the "
            f"plan hard ceiling {PLAN_CONCURRENCY_CEILING}"
        )
    if policy["concurrency"]["capacity"] > policy["concurrency"]["ceiling"]:
        raise PolicyError("concurrency.capacity must not exceed concurrency.ceiling")
    _assert_mapping("state", policy["state"])
    for key in _REQUIRED_STATE_KEYS:
        if key not in policy["state"]:
            raise PolicyError(f"state missing {key}")
    for key in policy["state"]:
        if key not in _REQUIRED_STATE_KEYS:
            raise PolicyError(f"unknown state field: {key}")
    _assert_string("state.directory_env", policy["state"]["directory_env"])
    _validate_slot_pattern("state.slot_lock_pattern", policy["state"]["slot_lock_pattern"])
    _validate_slot_pattern("state.slot_owner_pattern", policy["state"]["slot_owner_pattern"])
    _assert_mapping("env_refs", policy["env_refs"])
    for key in _REQUIRED_ENV_REF_KEYS:
        if key not in policy["env_refs"]:
            raise PolicyError(f"env_refs missing {key}")
    for key in policy["env_refs"]:
        if key not in _REQUIRED_ENV_REF_KEYS:
            raise PolicyError(f"unknown env_refs field: {key}")
    for key, env_name in policy["env_refs"].items():
        _assert_string(f"env_refs.{key}", env_name)
        if not env_name or "=" in env_name:
            raise PolicyError(f"env_refs.{key} must be a bare environment variable name")
    _assert_mapping("bounds", policy["bounds"])
    for key in _REQUIRED_BOUNDS_KEYS:
        if key not in policy["bounds"]:
            raise PolicyError(f"bounds missing {key}")
    for key in policy["bounds"]:
        if key not in _REQUIRED_BOUNDS_KEYS:
            raise PolicyError(f"unknown bounds field: {key}")
    _assert_positive_number("bounds.wait_seconds", policy["bounds"]["wait_seconds"])
    _assert_positive_number("bounds.poll_interval_seconds", policy["bounds"]["poll_interval_seconds"])
    _assert_positive_number("bounds.grace_seconds", policy["bounds"]["grace_seconds"])
    _assert_mapping("privacy", policy["privacy"])
    for key in _REQUIRED_PRIVACY_KEYS:
        if key not in policy["privacy"]:
            raise PolicyError(f"privacy missing {key}")
    for key in policy["privacy"]:
        if key not in _REQUIRED_PRIVACY_KEYS:
            raise PolicyError(f"unknown privacy field: {key}")
    _assert_list_of_strings("privacy.owner_metadata_fields", policy["privacy"]["owner_metadata_fields"])
    _assert_mapping("exit_codes", policy["exit_codes"])
    for key in _REQUIRED_EXIT_CODES:
        if key not in policy["exit_codes"]:
            raise PolicyError(f"exit_codes missing {key}")
    for key in policy["exit_codes"]:
        if key not in _REQUIRED_EXIT_CODES:
            raise PolicyError(f"unknown exit_codes field: {key}")
    for key, value in policy["exit_codes"].items():
        if not isinstance(value, int) or isinstance(value, bool):
            raise PolicyError(f"exit_codes.{key} must be an integer")
    return policy


def validate_state_dir(path):
    if not os.path.isabs(path):
        raise StateError("state directory must be an absolute path")
    try:
        st = os.lstat(path)
    except FileNotFoundError:
        raise StateError("state directory does not exist")
    except OSError as exc:
        raise StateError(f"cannot stat state directory: {exc}")
    if stat.S_ISLNK(st.st_mode):
        raise StateError("state directory must not be a symlink")
    if not stat.S_ISDIR(st.st_mode):
        raise StateError("state path is not a directory")
    if st.st_uid != os.getuid():
        raise StateError("state directory is not owned by the current user")
    if st.st_mode & 0o077:
        raise StateError("state directory permissions are broader than 0700")


def open_state_dir(path):
    validate_state_dir(path)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    try:
        return os.open(path, flags)
    except OSError as exc:
        raise StateError(f"cannot open state directory: {exc}")


def open_lock_file(dirfd, filename, mode=0o600, retries=5, delay=0.01):
    if not _safe_name(filename):
        raise StateError("invalid lock filename")
    flags = os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_CLOEXEC
    last_exc = None
    for _ in range(retries):
        try:
            fd = os.open(filename, flags, mode, dir_fd=dirfd)
            break
        except FileNotFoundError as exc:
            last_exc = exc
            time.sleep(delay)
    else:
        raise StateError(f"cannot open lock file: {last_exc}")
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode):
            raise StateError("lock file is not a regular file")
        if st.st_uid != os.getuid():
            raise StateError("lock file is not owned by the current user")
        if stat.S_IMODE(st.st_mode) != mode:
            raise StateError(f"lock file mode must be {oct(mode)}")
    except Exception:
        os.close(fd)
        raise
    return fd


def _slot_lock_name(policy, slot):
    return policy["state"]["slot_lock_pattern"].format(slot=slot)


def _slot_owner_name(policy, slot):
    return policy["state"]["slot_owner_pattern"].format(slot=slot)


def acquire_slot(dirfd, policy, wait_seconds, poll_seconds, sig_ref):
    capacity = policy["concurrency"]["capacity"]
    fds = []
    dbg(f"acquire_slot: opening {capacity} slot lock files")
    try:
        for slot in range(capacity):
            fds.append(
                (slot, open_lock_file(dirfd, _slot_lock_name(policy, slot)))
            )
    except Exception:
        for _, fd in fds:
            os.close(fd)
        raise

    deadline = time.monotonic() + wait_seconds
    dbg(f"acquire_slot: deadline={deadline}, now={time.monotonic()}")
    try:
        poll_count = 0
        while True:
            if sig_ref[0]:
                raise InterruptedError("signal received while waiting")
            for slot, fd in fds:
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    dbg(f"acquire_slot: GOT LOCK on slot {slot}, fd={fd}")
                except BlockingIOError:
                    dbg(f"acquire_slot: slot {slot} fd={fd} is held (BlockingIOError)")
                    continue
                except OSError as e:
                    dbg(f"acquire_slot: slot {slot} fd={fd} OSError: {e}")
                    raise
                for other_slot, other_fd in fds:
                    if other_fd is not fd:
                        os.close(other_fd)
                return slot, fd
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                dbg(f"acquire_slot: TIMEOUT after {poll_count} polls")
                raise TimeoutError("admission timeout")
            poll_count += 1
            time.sleep(min(poll_seconds, remaining))
    except BaseException:
        for _, fd in fds:
            try:
                os.close(fd)
            except OSError:
                pass
        raise


def _now_utc():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_owner(dirfd, filename, lock_fd, slot, command_basename, env_refs, env):
    lock_stat = os.fstat(lock_fd)
    lease = secrets.token_hex(16)
    run_id = env.get(env_refs["paperclip_run_id"])
    agent_id = env.get(env_refs["paperclip_agent_id"])
    owner = {
        "schema_version": "ollama-cloud-admission-v1",
        "lease": lease,
        "slot": slot,
        "wrapper_pid": os.getpid(),
        "paperclip_run_id": run_id,
        "paperclip_agent_id": agent_id,
        "acquired_at_utc": _now_utc(),
        "lock_dev": lock_stat.st_dev,
        "lock_inode": lock_stat.st_ino,
        "command_basename": command_basename,
    }
    tmp_name = filename + ".tmp"
    tmp_flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW | os.O_CLOEXEC
    tmp_fd = os.open(tmp_name, tmp_flags, 0o600, dir_fd=dirfd)
    try:
        payload = json.dumps(owner, sort_keys=True).encode("utf-8")
        os.write(tmp_fd, payload)
        os.fsync(tmp_fd)
    finally:
        os.close(tmp_fd)
    os.replace(tmp_name, filename, src_dir_fd=dirfd, dst_dir_fd=dirfd)
    os.fsync(dirfd)
    return lease


def cleanup_owner(dirfd, filename, lock_fd, lease):
    try:
        fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=dirfd)
        with os.fdopen(fd, "r", encoding="utf-8", closefd=True) as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(data, dict):
        return
    if data.get("lease") != lease:
        return
    lock_stat = os.fstat(lock_fd)
    if data.get("lock_dev") != lock_stat.st_dev or data.get("lock_inode") != lock_stat.st_ino:
        return
    try:
        os.unlink(filename, dir_fd=dirfd)
    except FileNotFoundError:
        return
    os.fsync(dirfd)


def inspect_state(policy, env):
    state_dir = env.get(policy["state"]["directory_env"])
    if not state_dir:
        raise AdmissionError("state directory env not set", policy["exit_codes"]["EX_USAGE"])
    capacity = policy["concurrency"]["capacity"]
    allowed = set(policy["privacy"]["owner_metadata_fields"])
    dirfd = open_state_dir(state_dir)
    try:
        slots = []
        busy = 0
        for slot in range(capacity):
            lock_fd = open_lock_file(dirfd, _slot_lock_name(policy, slot))
            try:
                try:
                    fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    busy += 1
                    owner_data = _read_owner_safely(dirfd, _slot_owner_name(policy, slot))
                    lock_stat = os.fstat(lock_fd)
                    if (
                        owner_data is not None
                        and owner_data.get("lock_dev") == lock_stat.st_dev
                        and owner_data.get("lock_inode") == lock_stat.st_ino
                    ):
                        sanitized = {
                            k: owner_data[k]
                            for k in sorted(owner_data)
                            if k in allowed
                        }
                        slots.append({"slot": slot, "state": "busy", "owner": sanitized})
                    else:
                        slots.append({"slot": slot, "state": "busy_owner_unknown"})
                else:
                    fcntl.flock(lock_fd, fcntl.LOCK_UN)
                    slots.append({"slot": slot, "state": "free"})
            finally:
                os.close(lock_fd)
        return {
            "capacity": capacity,
            "ceiling": policy["concurrency"]["ceiling"],
            "busy": busy,
            "free": capacity - busy,
            "slots": slots,
        }
    finally:
        os.close(dirfd)


def _read_owner_safely(dirfd, filename):
    try:
        fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=dirfd)
        with os.fdopen(fd, "r", encoding="utf-8", closefd=True) as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return None


def run_command(policy, env, route_class, command_basename, argv):
    dbg(f"run_command: route_class={route_class}, command_basename={command_basename}")
    if route_class != policy["wrapped_route_class"]:
        raise AdmissionError(
            f"route class {route_class} is not wrapped; execute directly",
            policy["exit_codes"]["EX_USAGE"],
        )
    state_dir = env.get(policy["state"]["directory_env"])
    if not state_dir:
        raise AdmissionError("state directory env not set", policy["exit_codes"]["EX_USAGE"])
    dbg(f"run_command: state_dir={state_dir}")
    dirfd = open_state_dir(state_dir)
    dbg(f"run_command: opened state dir fd={dirfd}")

    sig_ref = [0]

    def handler(signum, _frame):
        if sig_ref[0] == 0:
            sig_ref[0] = signum

    old_int = signal.signal(signal.SIGINT, handler)
    old_term_handler = signal.signal(signal.SIGTERM, handler)

    lease = None
    slot = None
    lock_fd = None
    acquired = False
    try:
        try:
            slot, lock_fd = acquire_slot(
                dirfd,
                policy,
                policy["bounds"]["wait_seconds"],
                policy["bounds"]["poll_interval_seconds"],
                sig_ref,
            )
        except TimeoutError:
            dbg("run_command: acquire_slot TIMEOUT -> EX_TEMPFAIL")
            return policy["exit_codes"]["EX_TEMPFAIL"]
        except InterruptedError:
            return 128 + sig_ref[0]
        if sig_ref[0]:
            os.close(lock_fd)
            return 128 + sig_ref[0]

        lease = write_owner(
            dirfd,
            _slot_owner_name(policy, slot),
            lock_fd,
            slot,
            command_basename,
            policy["env_refs"],
            env,
        )
        acquired = True
    finally:
        signal.signal(signal.SIGINT, old_int)
        signal.signal(signal.SIGTERM, old_term_handler)
        if not acquired:
            if lock_fd is not None:
                os.close(lock_fd)
            os.close(dirfd)

    if not acquired:
        return  # unreachable

    dbg(f"run_command: acquired slot={slot}, lock_fd={lock_fd}, spawning child: {argv}")
    child = None

    def child_handler(signum, _frame):
        if child is not None and child.poll() is None:
            try:
                os.killpg(child.pid, signum)
            except ProcessLookupError:
                pass

    signal.signal(signal.SIGINT, child_handler)
    signal.signal(signal.SIGTERM, child_handler)

    try:
        child = subprocess.Popen(
            argv,
            env=env,
            close_fds=True,
            pass_fds=[lock_fd],
            preexec_fn=os.setsid,
        )
        dbg(f"run_command: child spawned, pid={child.pid}, waiting for child to finish")
        try:
            rc = child.wait(timeout=policy["bounds"]["grace_seconds"])
            dbg(f"run_command: child exited with rc={rc}")
            return rc
        except subprocess.TimeoutExpired:
            dbg("run_command: child timeout -> SIGKILL")
            os.killpg(child.pid, signal.SIGKILL)
            return child.wait()
    finally:
        signal.signal(signal.SIGINT, old_int)
        signal.signal(signal.SIGTERM, old_term_handler)
        if child is not None and child.poll() is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            except ProcessLookupError:
                pass
        dbg(f"run_command: cleaning up owner and closing lock_fd={lock_fd}")
        if lease is not None:
            cleanup_owner(dirfd, _slot_owner_name(policy, slot), lock_fd, lease)
        os.close(lock_fd)
        os.close(dirfd)
        dbg(f"run_command: done")


def _usage():
    sys.stderr.write(
        "usage: ollama_cloud_admission.py [--policy PATH] "
        "{validate|inspect|run <route_class> <command_basename> [--] <argv>...}\n"
    )
    return 64


def main(argv):
    if len(argv) < 2:
        return _usage()
    command = argv[1]
    policy_path = os.environ.get("PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY", DEFAULT_POLICY_PATH)
    arg_offset = 2
    if len(argv) > arg_offset and argv[arg_offset] == "--policy":
        if len(argv) <= arg_offset + 1:
            return _usage()
        policy_path = argv[arg_offset + 1]
        arg_offset += 2
    try:
        policy = load_policy(policy_path)
    except PolicyError as exc:
        sys.stderr.write(f"policy error: {exc}\n")
        return 64
    env = os.environ
    if command == "validate":
        state_dir = env.get(policy["state"]["directory_env"])
        if state_dir:
            dirfd = open_state_dir(state_dir)
            try:
                for slot in range(policy["concurrency"]["capacity"]):
                    lock_fd = open_lock_file(dirfd, _slot_lock_name(policy, slot))
                    os.close(lock_fd)
            finally:
                os.close(dirfd)
        return 0
    if command == "inspect":
        try:
            result = inspect_state(policy, env)
        except AdmissionError as exc:
            sys.stderr.write(f"admission error: {exc}\n")
            return exc.exit_code
        sys.stdout.write(json.dumps(result, sort_keys=True) + "\n")
        sys.stdout.flush()
        return 0
    if command == "run":
        if len(argv) < arg_offset + 2:
            return _usage()
        route_class = argv[arg_offset]
        command_basename = argv[arg_offset + 1]
        if len(argv) > arg_offset + 2 and argv[arg_offset + 2] == "--":
            child_argv = argv[arg_offset + 3:]
        else:
            child_argv = argv[arg_offset + 2:]
        try:
            return run_command(policy, env, route_class, command_basename, child_argv)
        except AdmissionError as exc:
            sys.stderr.write(f"admission error: {exc}\n")
            return exc.exit_code
        except StateError as exc:
            sys.stderr.write(f"state error: {exc}\n")
            return policy["exit_codes"]["EX_USAGE"]
    return _usage()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
