# =============================================================================
# DISCORD-LIKE THEME CONFIGURATION
# =============================================================================
# Global theme file for consistent styling across the application
# Discord-inspired dark theme with modern UI elements

# =============================================================================
# COLOR PALETTE
# =============================================================================

COLORS = {
    # Primary background colors (Light theme)
    'background_primary': '#f4f6fa',      # Main background (light gray)
    'background_secondary': '#ffffff',    # Secondary background (white)
    'background_tertiary': '#e9ecef',     # Tertiary background (lighter gray)

    # Text colors
    'text_primary': '#23272f',            # Primary text (dark gray)
    'text_secondary': '#495057',          # Secondary text (medium gray)
    'text_muted': '#adb5bd',              # Muted text (light gray)

    # Accent colors
    'accent_primary': '#1976d2',          # Blue (primary accent)
    'accent_secondary': '#1565c0',        # Darker blue for hover
    'accent_success': '#388e3c',          # Success green
    'accent_danger': '#d32f2f',           # Error red
    'accent_warning': '#ffa000',          # Warning orange

    # Financial card colors
    'income_color': '#43a047',            # Green for income/positive values
    'expense_color': '#e53935',           # Red for expenses/negative values
    'savings_color': '#00bcd4',           # Teal for savings
    'investment_color': '#8e24aa',        # Purple for investments
    'neutral_color': '#bdbdbd',           # Gray for neutral/default values

    # Input and interactive elements
    'input_background': '#ffffff',        # Input field background
    'input_border': '#ced4da',            # Input border
    'input_border_focus': '#1976d2',      # Input border when focused

    # Card and container elements
    'card_background': '#ffffff',         # Card background
    'card_border': '#e0e0e0',             # Card border
    'card_shadow': 'rgba(60, 60, 60, 0.08)',  # Card shadow
}

# =============================================================================
# COMPONENT STYLES
# =============================================================================

# Base card style for containers
CARD_STYLE = {
    'backgroundColor': COLORS['card_background'],
    'border': f"1px solid {COLORS['card_border']}",
    'borderRadius': '10px',
    'padding': '24px',
    'boxShadow': f"0 2px 10px {COLORS['card_shadow']}",
    'margin': '16px',
}

# Input field styling
INPUT_STYLE = {
    'backgroundColor': COLORS['input_background'],
    'border': f"1px solid {COLORS['input_border']}",
    'borderRadius': '6px',
    'color': COLORS['text_primary'],
    'padding': '12px',
    'fontSize': '16px',
    'width': '100%',
    'marginBottom': '12px',
    'boxSizing': 'border-box',
}

# Primary button styling
BUTTON_PRIMARY_STYLE = {
    'backgroundColor': COLORS['accent_primary'],
    'color': 'white',
    'border': 'none',
    'borderRadius': '6px',
    'padding': '12px 24px',
    'fontSize': '16px',
    'fontWeight': 'bold',
    'cursor': 'pointer',
    'width': '100%',
    'marginTop': '8px',
    'transition': 'background-color 0.2s ease',
    'boxShadow': '0 1px 4px rgba(25, 118, 210, 0.08)',
}

# Secondary button styling
BUTTON_SECONDARY_STYLE = {
    'backgroundColor': 'transparent',
    'color': COLORS['accent_primary'],
    'border': f"1px solid {COLORS['accent_primary']}",
    'borderRadius': '6px',
    'padding': '12px 24px',
    'fontSize': '16px',
    'fontWeight': 'bold',
    'cursor': 'pointer',
    'width': '100%',
    'marginTop': '8px',
    'transition': 'all 0.2s ease',
    'boxShadow': '0 1px 4px rgba(25, 118, 210, 0.04)',
}

# =============================================================================
# LAYOUT STYLES
# =============================================================================

# Main app container
APP_STYLE = {
    'backgroundColor': COLORS['background_primary'],
    'minHeight': '100vh',
    'fontFamily': 'Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif',
    'color': COLORS['text_primary'],
}

# Centered container for login/register forms
CENTERED_CONTAINER_STYLE = {
    'display': 'flex',
    'justifyContent': 'center',
    'alignItems': 'center',
    'minHeight': '100vh',
    'padding': '20px',
}

# Form container styling
FORM_CONTAINER_STYLE = {
    **CARD_STYLE,
    'width': '400px',
    'maxWidth': '90vw',
}

# Dashboard container styling
DASHBOARD_CONTAINER_STYLE = {
    'padding': '24px',
    'maxWidth': '1200px',
    'margin': '0 auto',
}

# =============================================================================
# TEXT STYLES
# =============================================================================

HEADING_STYLE = {
    'color': COLORS['text_primary'],
    'textAlign': 'center',
    'marginBottom': '24px',
    'fontSize': '28px',
    'fontWeight': 'bold',
}

SUBHEADING_STYLE = {
    'color': COLORS['text_secondary'],
    'textAlign': 'center',
    'marginBottom': '20px',
    'fontSize': '16px',
}

ERROR_STYLE = {
    'color': COLORS['accent_danger'],
    'textAlign': 'center',
    'marginTop': '12px',
    'fontSize': '14px',
}

SUCCESS_STYLE = {
    'color': COLORS['accent_success'],
    'textAlign': 'center',
    'marginTop': '12px',
    'fontSize': '14px',
}

# =============================================================================
# NAVIGATION BAR STYLES
# =============================================================================

NAVIGATION_BAR_STYLE = {
    'backgroundColor': COLORS['background_secondary'],
    'padding': '0',
    'margin': '0',
    'width': '100%'
}

NAV_LIST_STYLE = {
    'display': 'flex',
    'listStyle': 'none',
    'margin': '0',
    'padding': '0 24px',
    'alignItems': 'center',
    'height': '60px'
}

NAV_BUTTON_STYLE = {
    'backgroundColor': 'transparent',
    'border': 'none',
    'color': COLORS['text_secondary'],
    'padding': '12px 20px',
    'margin': '0 4px',
    'borderRadius': '6px',
    'fontSize': '16px',
    'fontWeight': '500',
    'cursor': 'pointer',
    'fontFamily': 'inherit',
    'outline': 'none'
}

NAV_BUTTON_ACTIVE_STYLE = {
    **NAV_BUTTON_STYLE,
    'color': COLORS['accent_primary']
}