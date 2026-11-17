import { ref } from 'vue'
import type { Ref } from 'vue'
import { confirmAction } from '@/utils/modal'
import { i18n } from '@/lang'
import { buildSheet } from '@/utils/workbook'

/**
 * Ask, then write the rows to an .xlsx.
 *
 * The same twenty lines -- confirm, dynamic import, column projection, download,
 * loading flag -- sit in five list pages. The writer is a heavy dependency, so
 * the import stays dynamic: it is only pulled when someone actually exports.
 *
 * The rows are supplied by the caller, which means what gets written is what the
 * page is holding: one page of results, not the whole collection. The old pages
 * did the same while their confirm text promised "所有", which is where the
 * default confirm text here differs from theirs.
 *
 * Timestamps arrive from the API as strings and go into the sheet as text.
 * `dateFormat` covers a caller that hands over a real Date -- the format stores
 * one as a number and needs to be told how to display it, so a Date without a
 * format is an error rather than a default.
 */

const DATE_FORMAT = 'yyyy-mm-dd hh:mm:ss'

/** One column of the sheet: which field it reads and what its header says. */
export interface ExportColumn<TRow> {
  field: keyof TRow & string
  title: string
}

interface ExportBase<TRow> {
  /** Rows to write. This is whatever the caller holds -- the current page, not the whole collection. */
  rows: TRow[]
  /** File name without the extension. */
  filename: string
  /** Confirmation text. `null` skips the confirmation. */
  confirmText?: string | null
}

/**
 * Columns are given as pairs, so a header cannot drift away from its field.
 * The `header` / `fields` form is the older one: two arrays that have to be
 * kept the same length and order by hand.
 */
export type ExportOptions<TRow> = ExportBase<TRow> & (
  | { columns: Array<ExportColumn<TRow>>, header?: never, fields?: never }
  | { header: string[], fields: Array<keyof TRow & string>, columns?: never }
)

export interface UseExportReturn {
  exportExcel: <TRow extends Record<string, unknown>>(
    options: ExportOptions<TRow>
  ) => Promise<boolean>
  /** True while the writer is loading or running. Bind to the button's `loading`. */
  exporting: Ref<boolean>
}

export function useExport(): UseExportReturn {
  const exporting = ref(false)

  /** Guards the whole interaction, dialog included -- see useRemove. */
  let pending = false

  const exportExcel = async<TRow extends Record<string, unknown>>(options: ExportOptions<TRow>): Promise<boolean> => {
    const { rows, filename, confirmText = i18n.global.t('composables.export.confirm') } = options
    const header = options.columns ? options.columns.map(column => column.title) : options.header
    const fields = options.columns ? options.columns.map(column => column.field) : options.fields
    if (pending) return false
    if (!rows.length) return false

    pending = true
    try {
      if (confirmText !== null) {
        try {
          await confirmAction({ content: confirmText, okText: i18n.global.t('common.export') })
        } catch {
          // Dismissing the confirm is a decision, not a failure
          return false
        }
      }

      exporting.value = true
      const { data, columns } = buildSheet(header, rows.map(row => fields.map(field => row[field])))

      // The browser entry, not the package root: the root offers none, and the
      // node one reaches for fs.
      const { default: writeXlsxFile } = await import('write-excel-file/browser')
      await writeXlsxFile(data, {
        sheet: 'Sheet1',
        columns,
        dateFormat: DATE_FORMAT
      }).toFile(`${filename}.xlsx`)
      return true
    } finally {
      pending = false
      exporting.value = false
    }
  }

  return { exportExcel, exporting }
}
