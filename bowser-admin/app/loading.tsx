import { Loader2, LoaderCircle } from 'lucide-react'

const Loading = () => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
    )
}

export default Loading;