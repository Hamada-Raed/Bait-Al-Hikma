"""
Encryption utilities for sensitive payment information
Uses Fernet encryption with additional obfuscation for extra security
"""
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib
import secrets
import string

def get_encryption_key():
    """Generate a consistent encryption key from Django SECRET_KEY"""
    secret_key = settings.SECRET_KEY
    # Create a 32-byte key from the secret key using SHA256
    key = hashlib.sha256(secret_key.encode()).digest()
    # Convert to base64 for Fernet
    return base64.urlsafe_b64encode(key)

def encrypt_account_number(account_number):
    """
    Encrypt account number before storing in database
    Uses Fernet encryption + additional obfuscation to make it look like random string
    """
    if not account_number:
        return None
    
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        
        # Encrypt using Fernet
        encrypted_bytes = fernet.encrypt(account_number.encode())
        encrypted_str = encrypted_bytes.decode('utf-8')
        
        # Add additional obfuscation: mix with random chars to make it less obvious
        # Split encrypted string and interleave with random alphanumeric chars
        obfuscated = _obfuscate_encrypted_string(encrypted_str)
        
        return obfuscated
    except Exception as e:
        # If encryption fails, raise an error (don't store unencrypted)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to encrypt account number: {str(e)}")
        raise ValueError(f"Failed to encrypt account number: {str(e)}")

def _obfuscate_encrypted_string(encrypted_str):
    """Add obfuscation to make encrypted string look less like encryption"""
    # Add a random prefix/suffix with special chars to confuse pattern detection
    random_prefix = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    random_suffix = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    
    # Combine with separators that look like encoding artifacts
    return f"{random_prefix}ENC{encrypted_str}END{random_suffix}"

def _deobfuscate_encrypted_string(obfuscated_str):
    """Remove obfuscation to get original encrypted string"""
    # Remove the random prefix and suffix
    if 'ENC' in obfuscated_str and 'END' in obfuscated_str:
        start_idx = obfuscated_str.find('ENC') + 3
        end_idx = obfuscated_str.find('END')
        if end_idx > start_idx:
            return obfuscated_str[start_idx:end_idx]
    # If obfuscation markers not found, assume it's old format (just encrypted)
    return obfuscated_str

def decrypt_account_number(encrypted_account_number):
    """
    Decrypt account number when retrieving from database
    """
    if not encrypted_account_number:
        return None
    
    try:
        # Remove obfuscation first
        deobfuscated = _deobfuscate_encrypted_string(encrypted_account_number)
        
        key = get_encryption_key()
        fernet = Fernet(key)
        decrypted = fernet.decrypt(deobfuscated.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        # If decryption fails, try old format (no obfuscation)
        try:
            key = get_encryption_key()
            fernet = Fernet(key)
            decrypted = fernet.decrypt(encrypted_account_number.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception as e2:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to decrypt account number: {str(e2)}")
            return None

def is_encrypted(value):
    """Check if a value is already encrypted"""
    if not value:
        return False
    # Check for obfuscated format
    if 'ENC' in str(value) and 'END' in str(value):
        return True
    # Check for Fernet format (starts with gAAAAAB)
    if str(value).startswith('gAAAAAB'):
        return True
    return False

