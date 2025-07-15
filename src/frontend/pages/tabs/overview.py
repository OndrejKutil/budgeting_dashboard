from dash import html
from utils.theme import COLORS, CARD_STYLE

def create_overview_tab():
    """Create the overview tab content"""
    
    content_card_style = {
        **CARD_STYLE,
        'backgroundColor': COLORS['background_secondary'],
        'margin': '0',
        'borderRadius': '8px',
        'minHeight': '400px'
    }
    
    return html.Div([
        html.H1("Dashboard Overview", style={
            'color': COLORS['text_primary'],
        }),
        # Add your overview content here
    ], style=content_card_style)
