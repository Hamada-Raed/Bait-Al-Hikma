export const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};

export const getMinimumAge = (userType: 'school_student' | 'university_student' | 'teacher' | null): number => {
    switch (userType) {
        case 'teacher':
            return 20;
        case 'school_student':
            return 7;
        case 'university_student':
            return 17;
        default:
            return 0;
    }
};

export const validateAge = (
    birthDate: string,
    userType: 'school_student' | 'university_student' | 'teacher' | null
): { isValid: boolean; message_en?: string; message_ar?: string } => {
    if (!birthDate || !userType) {
        return { isValid: true };
    }

    const age = calculateAge(birthDate);
    const minimumAge = getMinimumAge(userType);

    if (age < minimumAge) {
        let message_en = '';
        let message_ar = '';

        switch (userType) {
            case 'teacher':
                message_en = `Teachers must be at least ${minimumAge} years old. You are ${age} years old.`;
                message_ar = `يجب أن يكون عمر المعلمين ${minimumAge} سنة على الأقل. عمرك ${age} سنة.`;
                break;
            case 'school_student':
                message_en = `School students must be at least ${minimumAge} years old. You are ${age} years old.`;
                message_ar = `يجب أن يكون عمر طلاب المدارس ${minimumAge} سنوات على الأقل. عمرك ${age} سنة.`;
                break;
            case 'university_student':
                message_en = `University students must be at least ${minimumAge} years old. You are ${age} years old.`;
                message_ar = `يجب أن يكون عمر الطلاب الجامعيين ${minimumAge} سنة على الأقل. عمرك ${age} سنة.`;
                break;
        }

        return { isValid: false, message_en, message_ar };
    }

    return { isValid: true };
};
