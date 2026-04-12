import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/hashes/utils.js';

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        return Buffer.from(bytes).toString('base64');
    }

    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
        }
    }
    return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        return new Uint8Array(Buffer.from(base64, 'base64'));
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

// 1. Kyber (ML-KEM) for Key Exchange
export const generateKyberKeyPair = () => {
    const seed = randomBytes(64);
    const keys = ml_kem768.keygen(seed);
    return {
        publicKey: uint8ArrayToBase64(keys.publicKey),
        secretKey: uint8ArrayToBase64(keys.secretKey),
    };
};

export const encapsulateKyber = (publicKeyBase64: string) => {
    const publicKey = base64ToUint8Array(publicKeyBase64);
    const seed = randomBytes(32);
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey, seed);
    return {
        cipherText: uint8ArrayToBase64(cipherText),
        sharedSecret: uint8ArrayToBase64(sharedSecret),
    };
};

export const decapsulateKyber = (cipherTextBase64: string, secretKeyBase64: string) => {
    const cipherText = base64ToUint8Array(cipherTextBase64);
    const secretKey = base64ToUint8Array(secretKeyBase64);
    const sharedSecret = ml_kem768.decapsulate(cipherText, secretKey);
    return uint8ArrayToBase64(sharedSecret);
};

// 2. Dilithium (ML-DSA) for Digital Signatures
export const generateDilithiumKeyPair = () => {
    const seed = randomBytes(32);
    const keys = ml_dsa65.keygen(seed);
    return {
        publicKey: uint8ArrayToBase64(keys.publicKey),
        secretKey: uint8ArrayToBase64(keys.secretKey),
    };
};

export const signMessage = (message: string, secretKeyBase64: string) => {
    const msgBytes = new TextEncoder().encode(message);
    const secretKey = base64ToUint8Array(secretKeyBase64);
    const signature = ml_dsa65.sign(secretKey, msgBytes);
    return uint8ArrayToBase64(signature);
};

export const verifySignature = (message: string, signatureBase64: string, publicKeyBase64: string) => {
    const msgBytes = new TextEncoder().encode(message);
    const signature = base64ToUint8Array(signatureBase64);
    const publicKey = base64ToUint8Array(publicKeyBase64);
    return ml_dsa65.verify(publicKey, msgBytes, signature);
};

// 3. AES-256-GCM for Message Encryption
export const encryptMessage = (message: string, sharedSecretBase64: string) => {
    const sharedSecret = base64ToUint8Array(sharedSecretBase64).slice(0, 32); // AES-256 needs 32 bytes
    const nonce = randomBytes(12); // 96-bit nonce for GCM
    const msgBytes = new TextEncoder().encode(message);
    
    const cipher = gcm(sharedSecret, nonce);
    const cipherText = cipher.encrypt(msgBytes);
    
    return {
        cipherText: uint8ArrayToBase64(cipherText),
        nonce: uint8ArrayToBase64(nonce),
    };
};

export const decryptMessage = (cipherTextBase64: string, nonceBase64: string, sharedSecretBase64: string) => {
    const sharedSecret = base64ToUint8Array(sharedSecretBase64).slice(0, 32);
    const nonce = base64ToUint8Array(nonceBase64);
    const cipherText = base64ToUint8Array(cipherTextBase64);
    
    const cipher = gcm(sharedSecret, nonce);
    const msgBytes = cipher.decrypt(cipherText);
    
    return new TextDecoder().decode(msgBytes);
};
