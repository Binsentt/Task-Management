function SectionHeading({
  titleId,
  eyebrow,
  title,
  description,
  align = 'center',
}) {
  const alignment =
    align === 'left' ? 'text-left' : 'mx-auto max-w-2xl text-center'

  return (
    <div className={alignment}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={titleId}
        className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default SectionHeading
