import { randomInt } from "crypto";

export default function generateNumericOTP(length: number = 6): string {
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += randomInt(0, 10).toString();
    }
    return otp;
}