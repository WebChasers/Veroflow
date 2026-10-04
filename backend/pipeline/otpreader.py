import imaplib
import email
import re
import time
from email.header import decode_header


def wait_for_otp(gmail_user: str, gmail_app_password: str, sender_filter: str = None,
                  subject_filter: str = None, timeout: int = 60, poll_interval: int = 3):
    """
    Polls a Gmail inbox via IMAP for a new email containing an OTP code.

    Args:
        gmail_user: full Gmail address, e.g. "yourtest@gmail.com"
        gmail_app_password: the 16-char App Password (not your real password)
        sender_filter: only consider emails FROM this address/domain (optional but recommended)
        subject_filter: only consider emails whose subject contains this text (optional)
        timeout: how many seconds total to keep polling before giving up
        poll_interval: how many seconds to wait between each check

    Returns:
        The extracted OTP code as a string, or None if nothing found within timeout.
    """
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            imap = imaplib.IMAP4_SSL("imap.gmail.com")
            imap.login(gmail_user, gmail_app_password)
            imap.select("inbox")

            # Search for the most recent emails (unseen, to avoid re-reading old ones)
            status, messages = imap.search(None, "UNSEEN")
            if status == "OK":
                email_ids = messages[0].split()

                # Check newest first
                for eid in reversed(email_ids):
                    status, msg_data = imap.fetch(eid, "(RFC822)")
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)

                    from_addr = msg.get("From", "")
                    subject_raw = msg.get("Subject", "")
                    subject, encoding = decode_header(subject_raw)[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8", errors="ignore")

                    # Apply filters if given
                    if sender_filter and sender_filter.lower() not in from_addr.lower():
                        continue
                    if subject_filter and subject_filter.lower() not in subject.lower():
                        continue

                    # Extract body text
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            if content_type in ("text/plain", "text/html"):
                                try:
                                    body += part.get_payload(decode=True).decode(errors="ignore")
                                except:
                                    pass
                    else:
                        try:
                            body = msg.get_payload(decode=True).decode(errors="ignore")
                        except:
                            body = str(msg.get_payload())

                    # Look for a 4-8 digit code in subject or body
                    combined_text = subject + " " + body
                    match = re.search(r"\b(\d{4,8})\b", combined_text)
                    if match:
                        imap.logout()
                        return match.group(1)

            imap.logout()

        except Exception as e:
            print(f"[phase_otp_reader] IMAP check failed: {e}")

        time.sleep(poll_interval)

    return None  # timed out, no OTP found


if __name__ == "__main__":
    # Quick manual test — fill in your test Gmail account details before running
    code = wait_for_otp(
        gmail_user="yourtest@gmail.com",
        gmail_app_password="your16charapppassword",
        sender_filter="noreply@",
        timeout=60
    )
    print("OTP found:", code)