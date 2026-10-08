function FeatureCard({ icon: Icon, title, description, tone }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.025] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/[0.06]">
      <span
        className={`mb-6 flex size-12 items-center justify-center rounded-2xl ${tone} transition duration-300 group-hover:scale-105`}
      >
        <Icon aria-hidden="true" size={22} strokeWidth={1.9} />
      </span>
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  )
}

export default FeatureCard
