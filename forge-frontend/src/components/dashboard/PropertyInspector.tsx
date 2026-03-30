import { useProjectStore, type WorkflowNodeData } from '@/store/projectStore'

const STATUS_OPTIONS = ['draft', 'ready', 'live'] as const

export default function PropertyInspector() {
  const { nodes, selectedNodeId, updateNodeData, snapshot } = useProjectStore()
  const selected = nodes.find((n) => n.id === selectedNodeId)

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-center px-4">
        <div>
          <p className="text-sm text-muted-foreground">Select a node</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click any node to inspect it</p>
        </div>
      </div>
    )
  }

  const d = selected.data

  function update(patch: Partial<WorkflowNodeData>) {
    snapshot()
    updateNodeData(selected!.id, patch)
  }

  function updateConfig(key: string, value: string) {
    snapshot()
    updateNodeData(selected!.id, { config: { ...d.config, [key]: value } })
  }

  function removeConfigKey(key: string) {
    snapshot()
    const next = { ...d.config }
    delete next[key]
    updateNodeData(selected!.id, { config: next })
  }

  function addConfigKey() {
    const key = `key${Object.keys(d.config).length + 1}`
    snapshot()
    updateNodeData(selected!.id, { config: { ...d.config, [key]: '' } })
  }

  return (
    <div className="h-full overflow-y-auto inspector-scroll p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Properties
        </p>

        <div className="space-y-3">
          <Field label="Label">
            <input
              value={d.label}
              onChange={(e) => update({ label: e.target.value })}
              className="field-input"
              data-testid="prop-label"
            />
          </Field>

          <Field label="Subtitle">
            <input
              value={d.subtitle}
              onChange={(e) => update({ subtitle: e.target.value })}
              className="field-input"
              placeholder="Optional subtitle"
              data-testid="prop-subtitle"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={d.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={3}
              className="field-input resize-none"
              placeholder="What does this node do?"
              data-testid="prop-description"
            />
          </Field>

          <Field label="Status">
            <select
              value={d.status}
              onChange={(e) => update({ status: e.target.value as WorkflowNodeData['status'] })}
              className="field-input"
              data-testid="prop-status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Config map */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Config
          </p>
          <button
            onClick={addConfigKey}
            className="text-xs text-primary hover:underline"
            data-testid="add-config"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(d.config).map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <input
                value={k}
                readOnly
                className="field-input w-2/5 text-xs font-mono"
              />
              <input
                value={v}
                onChange={(e) => updateConfig(k, e.target.value)}
                className="field-input flex-1 text-xs font-mono"
              />
              <button
                onClick={() => removeConfigKey(k)}
                className="text-muted-foreground hover:text-destructive px-1 text-xs"
                data-testid={`remove-config-${k}`}
              >
                ✕
              </button>
            </div>
          ))}
          {Object.keys(d.config).length === 0 && (
            <p className="text-xs text-muted-foreground/60">No config keys yet</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Notes
        </p>
        <textarea
          value={d.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={4}
          className="field-input w-full resize-none text-xs"
          placeholder="Internal notes…"
          data-testid="prop-notes"
        />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
