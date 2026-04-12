function DocumentHeader({ title }) {
  return (
    <div className="mb-5 border-b border-slate-300 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-right text-sm leading-6 text-slate-600">
          <h3 className="font-display text-3xl text-slate-900">
            الفؤاد للتجهيزات الطبية
          </h3>
          <p>Al Fouad Medical Supplies & Equipment</p>
          <p>وراق العرب</p>
          <p>الهاتف: 01011099611 - 01006369031</p>
          <p>Alfouad.medical2026@gmail.com</p>
        </div>
        <img
          src="./invoice_icon.png"
          alt="Al Fouad Medical Logo"
          className="h-44 w-44 object-contain"
        />
      </div>

      <div className="mt-4 flex items-center justify-center border-t border-slate-300 pt-3">
        <h4 className="font-display text-2xl font-semibold text-slate-900">
          {title}
        </h4>
      </div>
    </div>
  );
}

export default DocumentHeader;
