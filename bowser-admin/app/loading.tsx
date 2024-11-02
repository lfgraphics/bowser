import { LoaderCircle } from 'lucide-react'

const Loading = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <LoaderCircle className="w-12 h-12 text-white animate-spin" />
        </div>
    )
}

export default Loading;