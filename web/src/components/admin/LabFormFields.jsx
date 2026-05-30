import { t } from '../../lib/languages'

export default function LabFormFields({ form, setForm, cities, inputClass, language, showCity }) {
  return (
    <>
      {showCity && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('province_label_req', language)} *</label>
          <select aria-label={t('province_label_req', language)} className={`${inputClass} w-full`} value={form.city_id || ''} onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))} required>
            <option value="">{t('select_province', language)}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('studio_name_label_req', language)} *</label>
        <input type="text" aria-label={t('studio_name_label_req', language)} className={`${inputClass} w-full`} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_description', language)}</label>
        <input type="text" aria-label={t('lbl_description', language)} className={`${inputClass} w-full`} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_location', language)}</label>
        <input type="text" aria-label={t('lbl_location', language)} className={`${inputClass} w-full`} value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_branches', language)}</label>
        <input type="text" aria-label={t('lbl_branches', language)} className={`${inputClass} w-full`} value={form.branches || ''} onChange={e => setForm(p => ({ ...p, branches: e.target.value }))} placeholder={t('lbl_branches_placeholder', language)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_capacity_slot', language)}</label>
        <input type="number" aria-label={t('lbl_capacity_slot', language)} min="1" className={`${inputClass} w-full`} value={form.capacity_per_slot ?? ''} onChange={e => setForm(p => ({ ...p, capacity_per_slot: e.target.value }))} />
      </div>
    </>
  )
}
