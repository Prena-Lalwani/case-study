import { TbUpload, TbFileUpload } from 'react-icons/tb'

/**
 * Government ID upload CTA banner — sits above the personal details form.
 */
const UploadBanner = () => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center shrink-0">
        <TbFileUpload className="text-blue-action" style={{ fontSize: 18 }} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-navy leading-tight">
          Upload your government ID to auto-fill{' '}
          <span className="text-blue-action">4 fields instantly</span>
        </p>
        <p className="text-[12px] text-secondary mt-0.5">
          Driver's licence, passport or national ID · processed locally · AES-256
        </p>
      </div>
    </div>
    <button
      type="button"
      className="flex items-center justify-center gap-1.5 border border-blue-action text-blue-action text-[13px] font-medium px-3 py-1.5 rounded-lg hover:bg-blue-action hover:text-white transition-colors duration-150 sm:shrink-0 w-full sm:w-auto"
    >
      <TbUpload style={{ fontSize: 15 }} />
      Upload ID
    </button>
  </div>
)

export default UploadBanner
