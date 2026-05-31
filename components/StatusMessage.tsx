interface Props {
  state: 'loading' | 'downloading' | 'error'
  message?: string
}

export default function StatusMessage({ state, message }: Props) {
  if (state === 'loading') {
    return (
      <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
        <span className="animate-spin inline-block">⏳</span>
        Buscando informações...
      </p>
    )
  }
  if (state === 'downloading') {
    return (
      <p className="mt-4 text-sm text-indigo-600 flex items-center gap-2">
        <span className="animate-spin inline-block">⏳</span>
        Preparando download...
      </p>
    )
  }
  return (
    <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {message ?? 'Ocorreu um erro. Tente novamente.'}
    </div>
  )
}
