import { z } from 'zod';

export interface PasswordRequirement {
    met: boolean;
    message_en: string;
    message_ar: string;
}

export const passwordSchema = z.string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .refine((password) => /[A-Z]/.test(password), {
        message: "Password must contain at least one uppercase letter"
    })
    .refine((password) => /[a-z]/.test(password), {
        message: "Password must contain at least one lowercase letter"
    })
    .refine((password) => /[0-9]/.test(password), {
        message: "Password must contain at least one number"
    })
    .refine((password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), {
        message: "Password must contain at least one special character"
    });

export const getPasswordRequirements = (password: string): PasswordRequirement[] => {
    return [
        {
            met: password.length >= 8,
            message_en: "At least 8 characters",
            message_ar: "8 أحرف على الأقل"
        },
        {
            met: /[A-Z]/.test(password),
            message_en: "One uppercase letter (A-Z)",
            message_ar: "حرف كبير واحد (A-Z)"
        },
        {
            met: /[a-z]/.test(password),
            message_en: "One lowercase letter (a-z)",
            message_ar: "حرف صغير واحد (a-z)"
        },
        {
            met: /[0-9]/.test(password),
            message_en: "One number (0-9)",
            message_ar: "رقم واحد (0-9)"
        },
        {
            met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            message_en: "One special character (!@#$%^&*...)",
            message_ar: "رمز خاص واحد (!@#$%^&*...)"
        }
    ];
};

export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    try {
        passwordSchema.parse(password);
        return { isValid: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { isValid: false, error: error.issues[0].message };
        }
        return { isValid: false, error: "Invalid password" };
    }
};
