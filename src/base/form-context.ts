import { createContext, useContext } from 'react'

export type FormContextValue = {
  submit: () => void
  validationMode: 'onSubmit' | 'onBlur' | 'onChange'
}

export const FormContext = createContext<FormContextValue | null>(null)

export function useFormContext() {
  return useContext(FormContext)
}
