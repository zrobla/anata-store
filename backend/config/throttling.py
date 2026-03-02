from rest_framework.throttling import ScopedRateThrottle


class CatalogThrottle(ScopedRateThrottle):
    scope = "catalog"


class CheckoutThrottle(ScopedRateThrottle):
    scope = "checkout"


class InteractionThrottle(ScopedRateThrottle):
    scope = "interaction"
