"""
Currency Normalization and Conversion Utility
Gantavya Intelligence Engine - Milestone 2.4

Strict Rule: Never combine different currencies without valid conversion data.
Normalizes all multimodal fares into the platform base currency (INR).
"""

from typing import Dict
from app.schemas.transportation import CurrencyEnum


# Standard benchmark reference rates against base currency INR
EXCHANGE_RATES_TO_INR: Dict[CurrencyEnum, float] = {
    CurrencyEnum.INR: 1.0,
    CurrencyEnum.NPR: 0.625,  # 1 INR ~ 1.60 NPR (Fixed peg)
    CurrencyEnum.USD: 86.50,
    CurrencyEnum.EUR: 93.00,
    CurrencyEnum.GBP: 110.00,
}


class CurrencyConverter:
    """
    Handles robust currency conversions to ensure all multi-objective evaluations
    compare costs strictly in identical base monetary units (INR).
    """

    def __init__(self, base_currency: CurrencyEnum = CurrencyEnum.INR, custom_rates: Dict[CurrencyEnum, float] = None):
        self.base_currency = base_currency
        self.rates = dict(EXCHANGE_RATES_TO_INR)
        if custom_rates:
            self.rates.update(custom_rates)

    def convert_to_base(self, amount: float, from_currency: CurrencyEnum) -> float:
        """
        Converts an amount from a specified currency into the base currency (INR).
        """
        if amount <= 0:
            return 0.0

        if from_currency == self.base_currency:
            return float(amount)

        if from_currency not in self.rates:
            raise ValueError(f"Unsupported currency conversion from '{from_currency}' to '{self.base_currency}'")

        rate = self.rates[from_currency]
        return round(float(amount) * rate, 2)

    def convert_between(self, amount: float, from_curr: CurrencyEnum, to_curr: CurrencyEnum) -> float:
        """
        Converts between any two supported currencies via base currency pivot.
        """
        if from_curr == to_curr:
            return float(amount)

        in_base = self.convert_to_base(amount, from_curr)
        if to_curr == self.base_currency:
            return in_base

        to_rate = self.rates.get(to_curr)
        if not to_rate or to_rate <= 0:
            raise ValueError(f"Invalid rate for target currency '{to_curr}'")

        return round(in_base / to_rate, 2)


default_currency_converter = CurrencyConverter()

