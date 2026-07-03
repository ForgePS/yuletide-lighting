'use client';

import { useState } from 'react';
import type { PropertyProfileFormValues } from '@/lib/property-profile-utils';
import {
  emptyPropertyProfileForm,
  formValuesToPropertyPayload,
  PROPERTY_PROFILE_TYPE_OPTIONS,
} from '@/lib/property-profile-utils';
import { SITE_HAZARD_OPTIONS } from '@/lib/customer360-utils';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { InstallComplexitySelector } from './install-complexity-selector';
import { PropertyPhotoUploader } from './property-photo-uploader';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function PropertyProfileForm({
  initial,
  onSubmit,
  loading,
  submitLabel = 'Save property profile',
}: {
  initial?: PropertyProfileFormValues;
  onSubmit: (data: ReturnType<typeof formValuesToPropertyPayload>) => void;
  loading?: boolean;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<PropertyProfileFormValues>(initial ?? emptyPropertyProfileForm());

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formValuesToPropertyPayload(form));
      }}
    >
      <Section title="Property & address">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Property name *</span>
            <input
              required
              className="input w-full"
              value={form.propertyName}
              onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
              placeholder="Main residence"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Property type</span>
            <select
              className="input w-full"
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyProfileFormValues['propertyType'] })}
            >
              {PROPERTY_PROFILE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Street address *</span>
            <input
              required
              className="input w-full"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
          </label>
          <input
            className="input sm:col-span-2"
            placeholder="Apt / suite (optional)"
            value={form.addressLine2}
            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
          />
          <input required className="input" placeholder="City *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input required className="input" placeholder="State *" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <input required className="input" placeholder="ZIP *" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
        </div>
      </Section>

      <Section title="Roofline & structure">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Est. roofline (ft)</span>
            <input
              type="number"
              min={0}
              className="input w-full"
              value={form.estimatedRooflineFeet}
              onChange={(e) => setForm({ ...form, estimatedRooflineFeet: e.target.value })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Peaks</span>
            <input
              type="number"
              min={0}
              className="input w-full"
              value={form.peaks}
              onChange={(e) => setForm({ ...form, peaks: e.target.value })}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Roofline notes</span>
          <textarea
            className="input w-full"
            rows={3}
            value={form.roofMeasurementNotes}
            onChange={(e) => setForm({ ...form, roofMeasurementNotes: e.target.value })}
            placeholder="Gables, dormers, second story runs, etc."
          />
        </label>
      </Section>

      <Section title="Trees & landscaping">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Trees</span>
            <input type="number" min={0} className="input w-full" value={form.treeCount} onChange={(e) => setForm({ ...form, treeCount: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Shrubs</span>
            <input type="number" min={0} className="input w-full" value={form.shrubCount} onChange={(e) => setForm({ ...form, shrubCount: e.target.value })} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Wreath locations</span>
            <input className="input w-full" value={form.wreathLocations} onChange={(e) => setForm({ ...form, wreathLocations: e.target.value })} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Garland locations</span>
            <input className="input w-full" value={form.garlandLocations} onChange={(e) => setForm({ ...form, garlandLocations: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section title="Power & access">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Power outlet locations</span>
            <textarea
              className="input w-full"
              rows={2}
              value={form.powerSourceLocations}
              onChange={(e) => setForm({ ...form, powerSourceLocations: e.target.value })}
              placeholder="Front porch GFCI, garage outlet, etc."
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">GFCI notes</span>
            <textarea
              className="input w-full"
              rows={2}
              value={form.gfciNotes}
              onChange={(e) => setForm({ ...form, gfciNotes: e.target.value })}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Access notes</span>
            <textarea
              className="input w-full"
              rows={2}
              value={form.accessInstructions}
              onChange={(e) => setForm({ ...form, accessInstructions: e.target.value })}
              placeholder="Gate codes, dogs, parking, HOA rules..."
            />
          </label>
          <input className="input" placeholder="Gate code" value={form.gateCode} onChange={(e) => setForm({ ...form, gateCode: e.target.value })} />
          <input className="input" placeholder="HOA info" value={form.hoaInfo} onChange={(e) => setForm({ ...form, hoaInfo: e.target.value })} />
        </div>
        <MultiSelectDropdown
          label="Site hazards"
          placeholder="Select hazards"
          options={SITE_HAZARD_OPTIONS}
          values={form.siteHazards}
          onChange={(siteHazards) => setForm({ ...form, siteHazards })}
        />
        <textarea
          className="input w-full"
          rows={2}
          placeholder="Hazard notes"
          value={form.siteHazardNotes}
          onChange={(e) => setForm({ ...form, siteHazardNotes: e.target.value })}
        />
      </Section>

      <Section title="Install requirements">
        <InstallComplexitySelector
          value={form.installComplexity}
          onChange={(installComplexity) => setForm({ ...form, installComplexity })}
        />
        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ladderRequired}
              onChange={(e) => setForm({ ...form, ladderRequired: e.target.checked })}
              className="rounded border-border"
            />
            Ladder required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.liftRequired}
              onChange={(e) => setForm({ ...form, liftRequired: e.target.checked })}
              className="rounded border-border"
            />
            Lift / bucket truck required
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Ladder access points</span>
          <textarea
            className="input w-full"
            rows={2}
            value={form.ladderAccessPoints}
            onChange={(e) => setForm({ ...form, ladderAccessPoints: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Install notes</span>
          <textarea
            className="input w-full"
            rows={2}
            value={form.installNotes}
            onChange={(e) => setForm({ ...form, installNotes: e.target.value })}
          />
        </label>
      </Section>

      <Section title="Property photos">
        <PropertyPhotoUploader
          photos={form.galleryPhotos}
          onChange={(galleryPhotos) => setForm({ ...form, galleryPhotos })}
        />
      </Section>

      <Section title="Previous year design">
        <textarea
          className="input w-full"
          rows={4}
          value={form.previousYearDesignNotes}
          onChange={(e) => setForm({ ...form, previousYearDesignNotes: e.target.value })}
          placeholder="What was installed last season? Colors, feet counts, special requests..."
        />
      </Section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
