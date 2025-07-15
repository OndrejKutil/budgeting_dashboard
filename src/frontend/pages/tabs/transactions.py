from dash import html
from utils.theme import COLORS, CARD_STYLE

def create_transactions_tab():
    """Create the transactions tab content"""
    
    content_card_style = {
        **CARD_STYLE,
        'backgroundColor': COLORS['background_secondary'],
        'margin': '0',
        'borderRadius': '8px',
        'minHeight': '400px'
    }
    
    return html.Div([
        html.H1("Transactions", style={
            'color': COLORS['text_primary'],
        }),
        # Add your transactions content here
    ], style=content_card_style)
