import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  label?: string
  isInvalid?: boolean
  errorMessage?: string
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    type?: 'text' | 'email' | 'password' | 'number'
  }

type SelectProps = BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    type: 'select'
    children: ReactNode
  }

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    type: 'textarea'
  }

type Props = InputProps | SelectProps | TextareaProps

export default function FormField(props: Props) {
  const { label, isInvalid, errorMessage, ...rest } = props
  const invalidCls = isInvalid ? 'si-form-field__input--invalid' : ''

  return (
    <div className="si-form-field">
      {label && <label className="si-form-field__label">{label}</label>}

      {'type' in rest && rest.type === 'select' ? (
        <select
          className={`si-form-field__select ${invalidCls}`}
          {...(rest as Omit<SelectProps, keyof BaseProps>)}
        >
          {(rest as Omit<SelectProps, keyof BaseProps>).children}
        </select>
      ) : 'type' in rest && rest.type === 'textarea' ? (
        <textarea
          className={`si-form-field__textarea ${invalidCls}`}
          {...(rest as Omit<TextareaProps, keyof BaseProps>)}
        />
      ) : (
        <input
          className={`si-form-field__input ${invalidCls}`}
          {...(rest as Omit<InputProps, keyof BaseProps>)}
        />
      )}

      {errorMessage && <span className="si-form-field__error">{errorMessage}</span>}
    </div>
  )
}
