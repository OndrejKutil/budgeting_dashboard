from dash import html
from utils.theme import COLORS, CARD_STYLE

def create_monthly_view_tab():
    """Create the monthly view tab content"""
    
    content_card_style = {
        **CARD_STYLE,
        'backgroundColor': COLORS['background_secondary'],
        'margin': '0',
        'borderRadius': '8px',
        'minHeight': '400px'
    }
    
    return html.Div([
        html.H1("Monthly View", style={
            'color': COLORS['text_primary'],
        }),
        # Add your monthly view content here
    ], style=content_card_style)
