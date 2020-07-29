
//ref: https://nozzlegear.com/blog/implementing-a-jwt-auth-system-with-typescript-and-node
import { decode, encode, TAlgorithm } from "jwt-simple";

export interface User {
    id: Number
    name: string
}


export function encodeToken(secretKey: string, user: User): string {
    // Always use HS512 to sign the token
    const algorithm: TAlgorithm = "HS512";
    return encode(user, secretKey, algorithm)
}

export function decodeToken(secretKey: string, tokenString: string): User | null {
    // Always use HS512 to decode the token
    const algorithm: TAlgorithm = "HS512";

    let result: User;

    try {
        result = decode(tokenString, secretKey, false, algorithm);
    } catch (_e) {
        const e: Error = _e;

        // These error strings can be found here:
        // https://github.com/hokaccha/node-jwt-simple/blob/c58bfe5e5bb049015fcd55be5fc1b2d5c652dbcd/lib/jwt.js
        if (e.message === "No token supplied" || e.message === "Not enough or too many segments") {
            return null
        }

        if (e.message === "Signature verification failed" || e.message === "Algorithm not supported") {
            return null
        }

        // Handle json parse errors, thrown when the payload is nonsense
        if (e.message.indexOf("Unexpected token") === 0) {
            return null
        }

        throw e;
    }

    return result;
}
