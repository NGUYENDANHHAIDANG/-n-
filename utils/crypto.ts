// src/utils/crypto.ts

// Utility to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Utility to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP Key Pair for E2EE
export async function generateRSAKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const pubKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(pubKeyBuffer),
    privateKey: arrayBufferToBase64(privKeyBuffer)
  };
}

// Import Base64 Public Key
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Import Base64 Private Key
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt Message (Hybrid: AES-GCM for text, RSA-OAEP for AES key)
export async function encryptMessage(text: string, recipientPublicKeyBase64: string, senderPublicKeyBase64: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // 1. Generate AES-GCM Key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt Text with AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );

  // 3. Export AES Key
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 4. Encrypt AES Key with Recipient's RSA Public Key
  const recipientPubKey = await importPublicKey(recipientPublicKeyBase64);
  const recipientEncryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    recipientPubKey,
    rawAesKey
  );

  // 5. Encrypt AES Key with Sender's RSA Public Key
  const senderPubKey = await importPublicKey(senderPublicKeyBase64);
  const senderEncryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    senderPubKey,
    rawAesKey
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    recipientEncryptedKey: arrayBufferToBase64(recipientEncryptedAesKeyBuffer),
    senderEncryptedKey: arrayBufferToBase64(senderEncryptedAesKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

// Decrypt Message
export async function decryptMessage(
  ciphertextBase64: string, 
  encryptedKeyBase64: string, 
  ivBase64: string, 
  myPrivateKeyBase64: string
): Promise<string> {
  try {
    // 1. Import Private Key
    const privateKey = await importPrivateKey(myPrivateKeyBase64);

    // 2. Decrypt AES Key
    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedAesKeyBuffer
    );

    // 3. Import AES Key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      {
        name: "AES-GCM",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // 4. Decrypt Ciphertext
    const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed", err);
    return "[Encrypted Message - Decryption Failed]";
  }
}
