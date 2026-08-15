'use client'

import {
  useEffect,
  useState,
  type InputHTMLAttributes,
} from 'react'
import { flushSync } from 'react-dom'

type TextProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onBlur' | 'type'
> & {
  value: string
  onCommit: (value: string) => void
  type?: 'text' | 'password'
}

/** Keeps typing local; commits into form config on blur. */
export function DeferredTextInput({
  value,
  onCommit,
  type = 'text',
  ...rest
}: TextProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  return (
    <input
      {...rest}
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local === value) return
        flushSync(() => {
          onCommit(local)
        })
      }}
    />
  )
}

type NumberProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onBlur' | 'type'
> & {
  value: number
  onCommit: (value: number) => void
}

export function DeferredNumberInput({
  value,
  onCommit,
  ...rest
}: NumberProps) {
  const [local, setLocal] = useState(String(value))

  useEffect(() => {
    setLocal(String(value))
  }, [value])

  return (
    <input
      {...rest}
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const next = Number(local)
        const committed = Number.isFinite(next) ? next : 0
        if (committed === value && local === String(value)) return
        flushSync(() => {
          onCommit(committed)
        })
      }}
    />
  )
}
