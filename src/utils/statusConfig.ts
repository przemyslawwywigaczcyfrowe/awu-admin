import { AppraisalStatus } from '@/types/enums'

export interface StatusConfig {
  id: AppraisalStatus
  key: string
  label: string
  color: string
  severity: 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'
  icon: string
}

export const STATUS_CONFIG: Record<AppraisalStatus, StatusConfig> = {
  [AppraisalStatus.NOWA]: {
    id: AppraisalStatus.NOWA,
    key: 'nowa',
    label: 'Nowa',
    color: '#3B82F6',
    severity: 'info',
    icon: 'pi pi-inbox'
  },
  [AppraisalStatus.W_TRAKCIE_WERYFIKACJI]: {
    id: AppraisalStatus.W_TRAKCIE_WERYFIKACJI,
    key: 'w_trakcie_weryfikacji',
    label: 'W trakcie weryfikacji',
    color: '#F59E0B',
    severity: 'warn',
    icon: 'pi pi-search'
  },
  [AppraisalStatus.ZWERYFIKOWANA]: {
    id: AppraisalStatus.ZWERYFIKOWANA,
    key: 'zweryfikowana',
    label: 'Zweryfikowana',
    color: '#10B981',
    severity: 'success',
    icon: 'pi pi-check-circle'
  },
  [AppraisalStatus.SKORYGOWANA]: {
    id: AppraisalStatus.SKORYGOWANA,
    key: 'skorygowana',
    label: 'Skorygowana',
    color: '#F59E0B',
    severity: 'warn',
    icon: 'pi pi-pencil'
  },
  [AppraisalStatus.OCZEKUJE_NA_DECYZJE]: {
    id: AppraisalStatus.OCZEKUJE_NA_DECYZJE,
    key: 'oczekuje_na_decyzje',
    label: 'Oczekuje na decyzję klienta',
    color: '#F59E0B',
    severity: 'warn',
    icon: 'pi pi-clock'
  },
  [AppraisalStatus.ZAAKCEPTOWANA]: {
    id: AppraisalStatus.ZAAKCEPTOWANA,
    key: 'zaakceptowana',
    label: 'Zaakceptowana',
    color: '#10B981',
    severity: 'success',
    icon: 'pi pi-thumbs-up'
  },
  [AppraisalStatus.ODRZUCONA]: {
    id: AppraisalStatus.ODRZUCONA,
    key: 'odrzucona',
    label: 'Odrzucona',
    color: '#EF4444',
    severity: 'danger',
    icon: 'pi pi-thumbs-down'
  },
  [AppraisalStatus.UMOWA_W_PRZYGOTOWANIU]: {
    id: AppraisalStatus.UMOWA_W_PRZYGOTOWANIU,
    key: 'umowa_w_przygotowaniu',
    label: 'Umowa w przygotowaniu',
    color: '#3B82F6',
    severity: 'info',
    icon: 'pi pi-file'
  },
  [AppraisalStatus.UMOWA_PODPISANA]: {
    id: AppraisalStatus.UMOWA_PODPISANA,
    key: 'umowa_podpisana',
    label: 'Umowa podpisana',
    color: '#10B981',
    severity: 'success',
    icon: 'pi pi-file-check'
  },
  [AppraisalStatus.REALIZACJA_FINANSOWA]: {
    id: AppraisalStatus.REALIZACJA_FINANSOWA,
    key: 'realizacja_finansowa',
    label: 'Realizacja finansowa',
    color: '#3B82F6',
    severity: 'info',
    icon: 'pi pi-wallet'
  },
  [AppraisalStatus.ZAKONCZONA]: {
    id: AppraisalStatus.ZAKONCZONA,
    key: 'zakonczona',
    label: 'Zakończona',
    color: '#6B7280',
    severity: 'secondary',
    icon: 'pi pi-check'
  },
  [AppraisalStatus.PRZEKAZANA_DO_CENTRALI]: {
    id: AppraisalStatus.PRZEKAZANA_DO_CENTRALI,
    key: 'przekazana_do_centrali',
    label: 'Przekazana do centrali',
    color: '#8B5CF6',
    severity: 'contrast',
    icon: 'pi pi-building'
  },
  [AppraisalStatus.ZWROT_DO_KLIENTA]: {
    id: AppraisalStatus.ZWROT_DO_KLIENTA,
    key: 'zwrot_do_klienta',
    label: 'Zwrot do klienta',
    color: '#EF4444',
    severity: 'danger',
    icon: 'pi pi-replay'
  }
}

export const STATUS_TRANSITIONS: Record<AppraisalStatus, AppraisalStatus[]> = {
  [AppraisalStatus.NOWA]: [AppraisalStatus.W_TRAKCIE_WERYFIKACJI, AppraisalStatus.PRZEKAZANA_DO_CENTRALI],
  [AppraisalStatus.W_TRAKCIE_WERYFIKACJI]: [AppraisalStatus.ZWERYFIKOWANA, AppraisalStatus.SKORYGOWANA],
  [AppraisalStatus.ZWERYFIKOWANA]: [AppraisalStatus.OCZEKUJE_NA_DECYZJE, AppraisalStatus.UMOWA_W_PRZYGOTOWANIU],
  [AppraisalStatus.SKORYGOWANA]: [AppraisalStatus.OCZEKUJE_NA_DECYZJE],
  [AppraisalStatus.OCZEKUJE_NA_DECYZJE]: [AppraisalStatus.ZAAKCEPTOWANA, AppraisalStatus.ODRZUCONA],
  [AppraisalStatus.ZAAKCEPTOWANA]: [AppraisalStatus.UMOWA_W_PRZYGOTOWANIU],
  [AppraisalStatus.ODRZUCONA]: [AppraisalStatus.ZWROT_DO_KLIENTA],
  [AppraisalStatus.UMOWA_W_PRZYGOTOWANIU]: [AppraisalStatus.UMOWA_PODPISANA],
  [AppraisalStatus.UMOWA_PODPISANA]: [AppraisalStatus.REALIZACJA_FINANSOWA],
  [AppraisalStatus.REALIZACJA_FINANSOWA]: [AppraisalStatus.ZAKONCZONA],
  [AppraisalStatus.ZAKONCZONA]: [],
  [AppraisalStatus.PRZEKAZANA_DO_CENTRALI]: [AppraisalStatus.W_TRAKCIE_WERYFIKACJI],
  [AppraisalStatus.ZWROT_DO_KLIENTA]: []
}

export const getAllStatuses = (): StatusConfig[] => Object.values(STATUS_CONFIG)

export const getStatusConfig = (status: AppraisalStatus): StatusConfig => STATUS_CONFIG[status]

export const getAvailableTransitions = (status: AppraisalStatus): StatusConfig[] =>
  (STATUS_TRANSITIONS[status] || []).map(s => STATUS_CONFIG[s])
