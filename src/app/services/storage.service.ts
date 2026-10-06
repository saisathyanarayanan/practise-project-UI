import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly secretKey = 'my_secure_session_key_proj_one';

  /**
   * Encrypts and saves an item into sessionStorage
   */
  setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      sessionStorage.setItem(key, encrypted);
    } catch (e) {
      console.error('Error saving to sessionStorage', e);
    }
  }

  /**
   * Retrieves and decrypts an item from sessionStorage
   */
  getItem(key: string): string | null {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      return this.decrypt(encrypted);
    } catch (e) {
      console.error('Error reading from sessionStorage', e);
      return null;
    }
  }

  /**
   * Removes an item from sessionStorage
   */
  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  /**
   * Clears all session storage
   */
  clear(): void {
    sessionStorage.clear();
  }

  /**
   * Client-side obfuscation/cipher using dynamic key XOR + base64 encoding
   */
  private encrypt(plainText: string): string {
    const textChars = plainText.split('');
    const keyChars = this.secretKey.split('');
    const encryptedChars = textChars.map((char, index) => {
      const keyChar = keyChars[index % keyChars.length];
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
    });
    return btoa(encryptedChars.join(''));       // binary to ASCII (base64) encoding for safe storage in sessionStorage
  }

  private decrypt(cipherText: string): string {
    const rawChars = atob(cipherText).split('');  // ASCII (base64) to binary decoding.....from base 64 to original string.....
    const keyChars = this.secretKey.split('');
    const decryptedChars = rawChars.map((char, index) => {
      const keyChar = keyChars[index % keyChars.length];
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
    });
    return decryptedChars.join('');
  } 
}
