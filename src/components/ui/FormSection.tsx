interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={className}>
      <header className="mb-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-2">
      <h1 className="bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
      )}
    </header>
  );
}
