import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import clsx from 'clsx';

interface Props extends TextInputProps {
  className?: string;
}

export function Input({ className, ...props }: Props) {
  return (
    <TextInput
      className={clsx(
        'h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-900',
        'bg-white',
        className,
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}