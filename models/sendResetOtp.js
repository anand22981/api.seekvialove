const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResetOtp(email, otp) {
    const { data, error } = await resend.emails.send({
        from: "SeekViaLove <noreply@seekvialove.com>",
        to: [email],
        subject: "Your SeekViaLove Password Reset OTP",

        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>Password Reset</h2>

                <p>Your password reset OTP is:</p>

                <h1 style="letter-spacing: 8px;">
                    ${otp}
                </h1>

                <p>
                    This OTP is valid for <b>10 minutes</b>.
                </p>

                <p>
                    If you did not request a password reset,
                    please ignore this email.
                </p>

                <p>— SeekViaLove</p>
            </div>
        `
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error("Failed to send email");
    }

    return data;
}

module.exports = sendResetOtp;