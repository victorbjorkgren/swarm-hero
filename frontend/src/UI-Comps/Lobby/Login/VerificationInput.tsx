import React, { useState, useRef, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';

interface VerificationInputProps {
    length?: number; // Number of input boxes
    onComplete?: (code: string) => void; // Callback when all fields are filled
}

const VerificationInput: React.FC<VerificationInputProps> = ({ length = 6, onComplete }) => {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return; // Allow only digits
        const updatedValues = [...values];
        updatedValues[index] = value;
        setValues(updatedValues);

        // Move focus to the next box
        if (value && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }

        // Notify parent when all fields are filled
        if (updatedValues.every((val) => val !== '') && onComplete) {
            onComplete(updatedValues.join(''));
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/\D/g, '');
        const updatedValues = Array(length)
            .fill('')
            .map((_, i) => pastedData[i] || '');
        setValues(updatedValues);

        // Focus the next empty input
        const nextEmptyIndex = updatedValues.findIndex((val) => val === '');
        if (nextEmptyIndex !== -1) {
            inputsRef.current[nextEmptyIndex]?.focus();
        } else {
            inputsRef.current[length - 1]?.blur();
        }

        // Notify parent if all fields are filled
        if (updatedValues.every((val) => val !== '') && onComplete) {
            onComplete(updatedValues.join(''));
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!values[index] && index > 0) {
                inputsRef.current[index - 1]?.focus();
            }
        }
    };

    return (
        <div className={"flex gap-5 justify-evenly items-center"}>
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={value}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={"w-32 h-32 rounded-xl text-3xl p-2 bg-transparent border-white border-2 text-center"}
                />
            ))}
        </div>
    );
};

export default VerificationInput;