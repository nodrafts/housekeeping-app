import React from 'react';
import { Pressable, Text, PressableProps } from 'react-native';
import clsx from 'clsx';

interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}

export function Button({ children, variant = 'default', className, ...props }: ButtonProps) {
  const base = 'flex-row items-center justify-center';
  const variants = {
    default: 'bg-slate-900',
    outline: 'border border-slate-300 bg-white',
  } as const;

  return (
    <Pressable
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={variant === 'default' ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
