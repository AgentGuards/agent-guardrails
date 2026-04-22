import { CreatePolicyWizard } from "@/components/wizard/CreatePolicyWizard"

export default function NewAgentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Agent Policy</h1>
      <CreatePolicyWizard />
    </div>
  )
}
