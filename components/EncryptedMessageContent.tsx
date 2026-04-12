import React, { useEffect, useState } from 'react';
import { Message } from '../types';
import { decapsulateKyber, decryptMessage as pqcDecrypt } from '../utils/pqc';
import { useAuth } from '../context/AuthContext';

export const EncryptedMessageContent: React.FC<{ msg: Message }> = ({ msg }) => {
    const { user } = useAuth();
    const [decryptedText, setDecryptedText] = useState<string | null>(null);

    useEffect(() => {
        if (msg.pqcData && user) {
            const privKey = localStorage.getItem(`privKey_${user.id}`);
            if (privKey) {
                try {
                    let sharedSecret: string;
                    
                    if (msg.senderId === user.id) {
                        // If we are the sender, we don't have the shared secret stored in the message directly.
                        // In a real app, the sender would store the message plaintext locally or store the shared secret.
                        // For this demo, we'll just show a placeholder for the sender's own encrypted messages
                        // if they reload the page. (Optimistic UI already shows plaintext before reload).
                        setDecryptedText("[PQC Encrypted - Sent by you]");
                        return;
                    } else {
                        // We are the receiver, use our secret key to decapsulate
                        sharedSecret = decapsulateKyber(msg.pqcData.kyberCipherText, privKey);
                        const text = pqcDecrypt(msg.pqcData.aesCipherText, msg.pqcData.nonce, sharedSecret);
                        setDecryptedText(text);
                    }
                } catch (err) {
                    console.error("Failed to decrypt PQC message", err);
                    setDecryptedText("[PQC Decryption Failed]");
                }
            } else {
                setDecryptedText("[Encrypted Message - Private Key Missing]");
            }
        }
    }, [msg, user]);

    if (msg.pqcData) {
        return (
            <div className="flex flex-col">
                <div className="flex items-center space-x-1 mb-1 text-[10px] uppercase tracking-widest opacity-70 text-green-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <span>PQC E2EE</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {decryptedText || "Decrypting..."}
                </p>
            </div>
        );
    }

    return <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.text}</p>;
}
