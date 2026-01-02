// filterConfig.ts
// Mapping of selectedFilter keys to UI behavior configuration
import { TripStatusUpdateEnums, tripStatusUpdateVars } from '@/types';

export type DropdownItem = {
    label: string;
    action: 'statusUpdate' | 'link';
    status?: TripStatusUpdateEnums;
    link?: {
        pathname: string;
        query: Record<string, string>;
    };
};

export type FilterConfig = {
    showAdminLoadingPlanner: boolean;
    adminPlannerProps?: { trigger: string; type: "new" | "divert" };
    showDropdown: boolean;
    dropdownItems?: DropdownItem[] | null; // null means use default behavior (standard Update + Reported link)
};

// Helper to generate standard update items with optional exclusions
const getUpdateItems = (excluded: string[] = []): DropdownItem[] => {
    return tripStatusUpdateVars
        .filter(status => !excluded.includes(status))
        .map(status => ({
            label: status,
            action: 'statusUpdate',
            status: status as TripStatusUpdateEnums
        }));
};

// --- Behavior Definitions ---

// Configuration for Loaded category on way
const loadedOnWayBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Order', type: 'new' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(),
        {
            label: 'Reported',
            action: 'link',
            link: { pathname: 'trans-app/unloading-tracker', query: { actionType: 'report' } }
        }
    ]
};

// Configuration for Loaded category reported
const loadedReportedBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Order', type: 'new' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(),
        {
            label: 'Unloaded',
            action: 'link',
            link: { pathname: 'trans-app/unloading-tracker', query: { actionType: 'unload' } }
        }
    ]
};

// Configuration for EmptyForLoading category on way
const emptyOnWayBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Divert', type: 'divert' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(),
        {
            label: 'Change Destination',
            action: 'link',
            link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
        },
        {
            label: 'Reported',
            action: 'link',
            link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'report' } }
        }
    ]
};

// Configuration for EmptyForLoading factor in / Depot Standing
const outsideStandingBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Divert', type: 'divert' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(),
        {
            label: 'Change Destination',
            action: 'link',
            link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
        },
        {
            label: 'Give Plan',
            action: 'link',
            link: { pathname: 'trans-app/loading-planner', query: {} }
        }
    ]
};

// Configuration for Other Standing / Maintenance
const otherStandingBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Order', type: 'divert' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(["In Depot", "In Distillery", "Loaded"]),
        {
            label: 'Change Destination',
            action: 'link',
            link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
        }
    ]
};

// Configuration for EmptyForLoading / Depot Standing (Give Plan)
// MATCHES LEGACY: emptyForLoading_depo_standing (Note 'depo' spelling)
const depotStandingBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Order', type: 'new' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(["In Depot", "In Distillery", "Loaded"]),
        {
            label: 'Give Plan',
            action: 'link',
            link: { pathname: 'trans-app/loading-planner', query: {} }
        }
    ]
};

// Configuration for EmptyForLoading / Reported (Change Destination)
const reportedBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Divert', type: 'divert' },
    showDropdown: true,
    dropdownItems: [
        ...getUpdateItems(),
        {
            label: 'Change Destination',
            action: 'link',
            link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
        }
    ]
};

// Standard behavior (fallback if needed)
const standardBehavior: FilterConfig = {
    showAdminLoadingPlanner: true,
    adminPlannerProps: { trigger: 'Order', type: 'new' },
    showDropdown: true,
    dropdownItems: null,
};

// Default configuration (when no buttons should be shown)
export const defaultConfig: FilterConfig = {
    showAdminLoadingPlanner: false,
    showDropdown: false,
    dropdownItems: null,
};

// --- The Config Mapping & Logic ---

export const getFilterConfig = (filterKey: string, isAdmin: boolean): FilterConfig => {
    const key = (filterKey || "").toLowerCase();

    // Loaded category
    if (key === 'loaded_total_on_way' || key === 'loaded_total_loaded' || key === 'loaded') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Order', type: 'new' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["Loaded", "In Distillery", "In Depot"]),
                {
                    label: 'Reported',
                    action: 'link',
                    link: { pathname: 'trans-app/unloading-tracker', query: { actionType: 'report' } }
                }
            ]
        };
    }

    if (key === 'loaded_reported') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Order', type: 'new' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["Loaded", "In Distillery"]),
                {
                    label: 'Unloaded',
                    action: 'link',
                    link: { pathname: 'trans-app/unloading-tracker', query: { actionType: 'unload' } }
                }
            ]
        };
    }

    // EmptyForLoading category
    if (key === 'emptyforloading_on_way' || key === 'emptyother_on_way') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Divert', type: 'divert' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["In Depot", "In Distillery", "Loaded"]),
                {
                    label: 'Change Destination',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
                },
                {
                    label: 'Reported',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'report' } }
                }
            ]
        };
    }

    if (key === 'emptyforloading_outside_standing' || key === 'emptyforloading_factory_in') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Order', type: 'divert' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["In Depot"]),
                {
                    label: 'Change Destination',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
                },
                {
                    label: 'Give Plan',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-planner', query: {} }
                }
            ]
        };
    }

    if (key === 'emptyforloading_depo_standing' || key === 'emptyforloading_depot_standing' || key === 'emptyother_depot_standing') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Order', type: 'new' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["In Depot", "In Distillery", "Loaded"]),
                {
                    label: 'Give Plan',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-planner', query: {} }
                }
            ]
        };
    }

    if (key === 'emptyforloading_reported') {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Divert', type: 'divert' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems([]), // All options
                {
                    label: 'Change Destination',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
                }
            ]
        };
    }

    // Other categories
    if (key === 'emptyother_standing' || key === 'emptyother_other_standing' || key.startsWith('undermaintenance')) {
        return {
            showAdminLoadingPlanner: isAdmin,
            adminPlannerProps: { trigger: 'Order', type: 'divert' },
            showDropdown: true,
            dropdownItems: [
                ...getUpdateItems(["In Depot", "In Distillery", "Loaded"]),
                {
                    label: 'Change Destination',
                    action: 'link',
                    link: { pathname: 'trans-app/loading-tracker', query: { actionType: 'destinationChange' } }
                }
            ]
        };
    }

    // Default Fallbacks
    if (key === 'emptyforloading' || key === 'emptyother' || key === 'emptyother_loaded' || key === 'all' || !key) {
        return defaultConfig;
    }

    return standardBehavior;
};

export default getFilterConfig;
