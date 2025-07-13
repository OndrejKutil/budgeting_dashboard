# =============================================================================
# DISCORD-LIKE THEME CONFIGURATION
# =============================================================================
# Global theme file for consistent styling across the application
# Discord-inspired dark theme with modern UI elements

# =============================================================================
# COLOR PALETTE
# =============================================================================

COLORS = {
    # Primary background colors (Discord-like dark theme)
    'background_primary': '#36393f',      # Main background (Discord dark)
    'background_secondary': '#2f3136',    # Secondary background (Discord darker)
    'background_tertiary': '#292b2f',     # Tertiary background (Discord darkest)
    
    # Text colors
    'text_primary': '#ffffff',            # Primary text (Discord white)
    'text_secondary': '#b9bbbe',          # Secondary text (Discord gray)
    'text_muted': '#72767d',              # Muted text (Discord light gray)
    
    # Accent colors
    'accent_primary': '#5865f2',          # Discord blurple
    'accent_secondary': '#4752c4',        # Darker blurple for hover
    'accent_success': '#3ba55c',          # Success green
    'accent_danger': '#ed4245',           # Error red
    'accent_warning': '#faa61a',          # Warning orange
    
    # Input and interactive elements
    'input_background': '#40444b',        # Input field background
    'input_border': '#72767d',            # Input border
    'input_border_focus': '#5865f2',      # Input border when focused
    
    # Card and container elements
    'card_background': '#2f3136',         # Card background
    'card_border': '#42464d',             # Card border
    'card_shadow': 'rgba(0, 0, 0, 0.3)',  # Card shadow
}

# =============================================================================
# COMPONENT STYLES
# =============================================================================

# Base card style for containers
CARD_STYLE = {
    'backgroundColor': COLORS['card_background'],
    'border': f"1px solid {COLORS['card_border']}",
    'borderRadius': '8px',
    'padding': '24px',
    'boxShadow': f"0 2px 10px {COLORS['card_shadow']}",
    'margin': '16px',
}

# Input field styling
INPUT_STYLE = {
    'backgroundColor': COLORS['input_background'],
    'border': f"1px solid {COLORS['input_border']}",
    'borderRadius': '4px',
    'color': COLORS['text_primary'],
    'padding': '12px',
    'fontSize': '16px',
    'width': '100%',
    'marginBottom': '12px',
}

# Primary button styling
BUTTON_PRIMARY_STYLE = {
    'backgroundColor': COLORS['accent_primary'],
    'color': 'white',
    'border': 'none',
    'borderRadius': '4px',
    'padding': '12px 24px',
    'fontSize': '16px',
    'fontWeight': 'bold',
    'cursor': 'pointer',
    'width': '100%',
    'marginTop': '8px',
    'transition': 'background-color 0.2s ease',
}

# Secondary button styling
BUTTON_SECONDARY_STYLE = {
    'backgroundColor': 'transparent',
    'color': COLORS['accent_primary'],
    'border': f"1px solid {COLORS['accent_primary']}",
    'borderRadius': '4px',
    'padding': '12px 24px',
    'fontSize': '16px',
    'fontWeight': 'bold',
    'cursor': 'pointer',
    'width': '100%',
    'marginTop': '8px',
    'transition': 'all 0.2s ease',
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
